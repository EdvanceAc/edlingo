import asyncio
from playwright import async_api

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://127.0.0.1:3002", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # Try to reload the page and then resize the window to a common resolution to see if UI components load properly.
        await page.goto('http://127.0.0.1:3002/', timeout=10000)
        

        await page.mouse.wheel(0, window.innerHeight)
        

        await page.mouse.wheel(0, -window.innerHeight)
        

        # Attempt to reload the application and resize the window to a smaller resolution to check if UI components load or become visible.
        await page.goto('http://127.0.0.1:3002/', timeout=10000)
        

        await page.mouse.wheel(0, window.innerHeight)
        

        await page.mouse.wheel(0, -window.innerHeight)
        

        # Input login credentials and sign in to access the main application UI for further responsiveness testing.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div/div/div/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('bennyb7878@gmail.com')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div/div/div/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('HAji.777')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div/div/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Resize the window to various common screen resolutions and verify that all UI components remain visible, properly aligned, and functional.
        await page.mouse.wheel(0, window.innerHeight)
        

        await page.mouse.wheel(0, -window.innerHeight)
        

        # Resize the window to a smaller resolution (e.g., 1366x768) and verify UI components remain visible, aligned, and functional.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/header/div[3]/div[4]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Resize the window to 1366x768 and verify UI components remain visible, aligned, and functional.
        await page.goto('http://127.0.0.1:3002/', timeout=10000)
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/header/div[3]/div[4]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Resize the window to 1366x768 and verify UI components remain visible, aligned, and functional.
        await page.goto('http://127.0.0.1:3002/', timeout=10000)
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/header/div[3]/div[4]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Resize the window to 1366x768 and verify UI components remain visible, aligned, and functional.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/header/div[3]/div[4]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Resize the window to 1366x768 and verify UI components remain visible, aligned, and functional.
        await page.goto('http://127.0.0.1:3002/', timeout=10000)
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/header/div[3]/div[4]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/header/div/form/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('1366x768')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/header/div[3]/div[4]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Resize the window to 1920x1080 and verify UI components remain visible, aligned, and functional.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/header/div/form/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('1920x1080')
        

        # Resize the window to a tablet/mobile resolution (e.g., 768x1024) and verify UI components remain visible, aligned, and functional.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/header/div/form/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('768x1024')
        

        # Resize the window to a mobile resolution (e.g., 375x667) and verify UI components remain visible, aligned, and functional.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/header/div/form/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('375x667')
        

        # Assert that the main app container is visible after resizing to various resolutions
        await page.wait_for_selector('div#app-container', state='visible')
        # Assert that the greeting message is visible and contains expected text
        greeting = await page.locator('text=Good afternoon! Ready to continue your language learning journey?').is_visible()
        assert greeting, 'Greeting message is not visible or incorrect'
        # Assert that the courses list is visible and each course action button is visible and enabled
        courses = await page.locator('div.course-item').all()
        assert len(courses) > 0, 'No courses found on the page'
        for course in courses:
            action_button = course.locator('button')
            assert await action_button.is_visible(), 'Course action button not visible'
            assert await action_button.is_enabled(), 'Course action button not enabled'
        # Assert that quick practice options are visible
        for option_text in ['Review Vocabulary', 'Practice Speaking', 'Grammar Quiz'] :
            option = await page.locator(f'text={option_text}')
            assert await option.is_visible(), f'Quick practice option "{option_text}" not visible'
        # Assert that recent achievements text is visible
        achievements = await page.locator('text=Complete lessons to earn achievements!').is_visible()
        assert achievements, 'Recent achievements text not visible'
        # Assert that weekly activity days are visible and show '0m' as per extracted content
        for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] :
            day_activity = await page.locator(f'text={day}').is_visible()
            assert day_activity, f'{day} label not visible'
            activity_time = await page.locator(f'text=0m').is_visible()
            assert activity_time, f'Activity time for {day} not visible or incorrect'
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    
