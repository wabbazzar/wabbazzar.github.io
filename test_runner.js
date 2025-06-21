// Visual Regression Test Runner for wabbazzar.github.io
// This runs automated visual tests to ensure the site renders correctly

const puppeteer = require('puppeteer');
const fs = require('fs');

// Test configuration
const TESTS = {
    colors: {
        background: 'rgb(0, 0, 0)',
        text: 'rgb(255, 255, 255)',
        accent: 'rgb(0, 212, 255)'
    },
    viewports: [
        { name: 'mobile', width: 320, height: 568 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1440, height: 900 }
    ],
    performance: {
        maxLoadTime: 1000,
        maxDOMReady: 500
    }
};

async function runTests() {
    console.log('Starting visual regression tests...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    try {
        // Test 1: Color verification
        console.log('Testing colors...');
        await page.goto('http://localhost:8000/index.html');
        
        const bodyStyles = await page.evaluate(() => {
            const body = document.body;
            const computedStyle = window.getComputedStyle(body);
            return {
                background: computedStyle.backgroundColor,
                color: computedStyle.color
            };
        });

        if (bodyStyles.background === TESTS.colors.background) {
            results.passed++;
            results.tests.push({ test: 'Background Color', status: 'PASS' });
        } else {
            results.failed++;
            results.tests.push({ 
                test: 'Background Color', 
                status: 'FAIL',
                expected: TESTS.colors.background,
                actual: bodyStyles.background
            });
        }

        // Test 2: Responsive design
        console.log('Testing responsive viewports...');
        for (const viewport of TESTS.viewports) {
            await page.setViewport({ width: viewport.width, height: viewport.height });
            await page.goto('http://localhost:8000/index.html');
            
            const isResponsive = await page.evaluate(() => {
                const main = document.querySelector('main');
                return main && window.getComputedStyle(main).display !== 'none';
            });

            if (isResponsive) {
                results.passed++;
                results.tests.push({ test: `Responsive ${viewport.name}`, status: 'PASS' });
            } else {
                results.failed++;
                results.tests.push({ test: `Responsive ${viewport.name}`, status: 'FAIL' });
            }
        }

        // Test 3: Performance
        console.log('Testing performance...');
        const metrics = await page.evaluate(() => {
            const timing = performance.timing;
            return {
                loadTime: timing.loadEventEnd - timing.navigationStart,
                domReady: timing.domContentLoadedEventEnd - timing.navigationStart
            };
        });

        if (metrics.loadTime < TESTS.performance.maxLoadTime) {
            results.passed++;
            results.tests.push({ test: 'Load Time', status: 'PASS', time: metrics.loadTime });
        } else {
            results.failed++;
            results.tests.push({ 
                test: 'Load Time', 
                status: 'FAIL',
                expected: `< ${TESTS.performance.maxLoadTime}ms`,
                actual: `${metrics.loadTime}ms`
            });
        }

        // Test 4: Hover states
        console.log('Testing hover states...');
        const hoverTest = await page.evaluate(() => {
            const links = document.querySelectorAll('a');
            if (links.length === 0) return { status: 'FAIL', reason: 'No links found' };
            
            // Check if hover styles are defined
            const styleSheets = Array.from(document.styleSheets);
            let hasHoverRules = false;
            
            for (const sheet of styleSheets) {
                try {
                    const rules = Array.from(sheet.cssRules || sheet.rules);
                    hasHoverRules = rules.some(rule => 
                        rule.selectorText && rule.selectorText.includes(':hover')
                    );
                    if (hasHoverRules) break;
                } catch (e) {
                    // Cross-origin stylesheet, skip
                }
            }
            
            return { 
                status: hasHoverRules ? 'PASS' : 'FAIL',
                linkCount: links.length
            };
        });

        if (hoverTest.status === 'PASS') {
            results.passed++;
            results.tests.push({ test: 'Hover States', status: 'PASS' });
        } else {
            results.failed++;
            results.tests.push({ test: 'Hover States', status: 'FAIL', reason: hoverTest.reason });
        }

        // Test 5: Typography
        console.log('Testing typography...');
        const typography = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            if (!h1) return { status: 'FAIL', reason: 'No h1 found' };
            
            const computedStyle = window.getComputedStyle(h1);
            const fontFamily = computedStyle.fontFamily.toLowerCase();
            
            return {
                status: fontFamily.includes('inter') || fontFamily.includes('system') ? 'PASS' : 'FAIL',
                font: computedStyle.fontFamily
            };
        });

        if (typography.status === 'PASS') {
            results.passed++;
            results.tests.push({ test: 'Typography', status: 'PASS' });
        } else {
            results.failed++;
            results.tests.push({ test: 'Typography', status: 'FAIL', font: typography.font });
        }

    } catch (error) {
        console.error('Test error:', error);
        results.failed++;
        results.tests.push({ test: 'Test Execution', status: 'FAIL', error: error.message });
    }

    await browser.close();

    // Display results
    console.log('\n=== TEST RESULTS ===');
    console.log(`Total Tests: ${results.passed + results.failed}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log('\nDetailed Results:');
    
    results.tests.forEach(test => {
        const status = test.status === 'PASS' ? '✓' : '✗';
        console.log(`${status} ${test.test}: ${test.status}`);
        if (test.expected) {
            console.log(`  Expected: ${test.expected}`);
            console.log(`  Actual: ${test.actual}`);
        }
        if (test.reason) {
            console.log(`  Reason: ${test.reason}`);
        }
    });

    // Save results to file
    fs.writeFileSync('test_results.json', JSON.stringify(results, null, 2));
    console.log('\nResults saved to test_results.json');

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}

// Check if puppeteer is installed, otherwise run a basic test
try {
    require.resolve('puppeteer');
    runTests();
} catch (e) {
    console.log('Puppeteer not installed. Running basic HTTP test...');
    
    const http = require('http');
    
    http.get('http://localhost:8000/', (res) => {
        console.log(`Server response: ${res.statusCode}`);
        if (res.statusCode === 200) {
            console.log('✓ Basic server test: PASS');
            process.exit(0);
        } else {
            console.log('✗ Basic server test: FAIL');
            process.exit(1);
        }
    }).on('error', (err) => {
        console.log('✗ Basic server test: FAIL');
        console.log(`Error: ${err.message}`);
        process.exit(1);
    });
} 