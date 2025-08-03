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
        await page.goto("http://localhost:3002", wait_until="commit", timeout=10000)
        
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
        # Try to refresh the page or navigate to a known URL or element to trigger loading of dashboard and exercise screens.
        await page.goto('http://localhost:3002/', timeout=10000)
        

        # Input email and password with provided credentials and click Sign In to access dashboard.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div/div/div/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('bennyb7878@gmail.com')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div/div/div/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('HAji.777')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div/div/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Resize the application window to various sizes (desktop, small laptop) and verify responsive layout and usability of dashboard components.
        await page.mouse.wheel(0, window.innerHeight)
        

        # Resize the application window to a smaller desktop size and verify that the layout adjusts responsively and remains usable.
        await page.goto('http://localhost:3002/', timeout=10000)
        

        # Resize the application window to a smaller desktop size and verify that the layout adjusts responsively and remains usable.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/header/div[3]/div[4]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/header/div[3]/div[4]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/header/div[3]/div[3]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Resize the application window to a smaller laptop size and verify that the layout adjusts responsively and remains usable.
        await page.mouse.wheel(0, window.innerHeight)
        

        # Resize the application window to a smaller laptop size and verify that the layout adjusts responsively and remains usable.
        await page.mouse.wheel(0, -window.innerHeight)
        

        # Resize the application window to smaller laptop and mobile sizes to verify responsive layout and usability. Then navigate to exercise screen to repeat checks. Confirm Framer Motion animations run smoothly during these interactions.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/main/div/div/div[4]/div/div/div/div[3]/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Assert that the page title is correct
        assert await page.title() == 'EdLingo - Language Learning'
        
        # Assert that user status elements are visible and contain expected values
        user_level = await page.locator('text=Level 1').is_visible()
        assert user_level
        user_xp = await page.locator('text=0 XP').is_visible() or await page.locator('text=XP: 0').is_visible()
        assert user_xp
        user_progress = await page.locator('text=75%').is_visible()
        assert user_progress
        
        # Assert navigation links are present and have correct href attributes
        nav_links = {
            'Dashboard': '/',
            'Courses': '/courses',
            'Chat': '/chat',
            'Enhanced Chat': '/enhanced-chat',
            'Live Conversation': '/live-conversation',
            'Pronunciation': '/pronunciation',
            'Vocabulary': '/vocabulary',
            'Grammar': '/grammar',
            'Assessment': '/assessment',
            'Settings': '/settings'
        }
        for link_text, href in nav_links.items():
            link = page.locator(f'a:has-text("{link_text}")')
            assert await link.is_visible()
            link_href = await link.get_attribute('href')
            assert link_href == href
          
        # Assert user profile options are visible
        profile_options = ['Profile', 'Settings', 'Sign Out']
        for option in profile_options:
            option_locator = page.locator(f'text={option}')
            assert await option_locator.is_visible()
          
        # Assert enhanced chat welcome message is visible
        welcome_msg = 'Welcome to Enhanced Chat! I can help you with grammar corrections, vocabulary suggestions, and pronunciation feedback. What would you like to practice?'
        welcome_locator = page.locator(f'text="{welcome_msg}"')
        assert await welcome_locator.is_visible()
          
        # Responsive layout assertions: check visibility and layout at different viewport sizes
        viewports = [
            {'width': 1920, 'height': 1080},  # Desktop
            {'width': 1366, 'height': 768},   # Small laptop
            {'width': 768, 'height': 1024},   # Tablet/mobile portrait
            {'width': 375, 'height': 667}     # Mobile
        ]
        for vp in viewports:
            await page.set_viewport_size(vp)
            await page.wait_for_timeout(1000)  # wait for layout to adjust
            # Check that main navigation is visible
            nav_visible = await page.locator('nav').is_visible()
            assert nav_visible
            # Check that key UI components are visible
            dashboard_visible = await page.locator('text=Dashboard').is_visible()
            courses_visible = await page.locator('text=Courses').is_visible()
            assert dashboard_visible and courses_visible
            # Check that no horizontal scrollbar appears (indicating layout fits)
            scroll_width = await page.evaluate('document.documentElement.scrollWidth')
            client_width = await page.evaluate('document.documentElement.clientWidth')
            assert scroll_width <= client_width
          
        # Animation smoothness check: verify presence of Framer Motion animation classes or attributes
        # and that animations are running (no freezing)
        # This is a heuristic check since direct animation frame timing is complex
        animated_elements = await page.locator('[class*="framer-motion"]')
        assert await animated_elements.count() > 0
        # Optionally check that animations are not paused or frozen by checking style or computed properties
        for i in range(await animated_elements.count()):
            el = animated_elements.nth(i)
            animation_play_state = await el.evaluate('(el) => window.getComputedStyle(el).animationPlayState')
            assert animation_play_state != 'paused'
            # Could add more checks for transform or opacity changes over time if needed
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    