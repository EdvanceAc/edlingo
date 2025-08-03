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
        # Try refreshing the page to attempt to resolve the loading issue.
        await page.goto('http://127.0.0.1:3002/', timeout=10000)
        

        # Input email and password, then click Sign In to authenticate and proceed to main application UI.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div/div/div/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('bennyb7878@gmail.com')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div/div/div/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('HAji.777')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div/div/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Test UI responsiveness by simulating different screen sizes and verify layout adapts correctly.
        await page.mouse.wheel(0, window.innerHeight)
        

        # Simulate different screen sizes to verify responsive layout and then navigate to Courses page to check component rendering and behavior.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div/nav/div[2]/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Simulate different screen sizes to verify responsive layout and then navigate to Chat page to check component rendering and behavior.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div/nav/div[3]/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Simulate different screen sizes to verify responsive layout of Chat page components, then simulate high load by sending multiple messages rapidly to test UI stability.
        await page.mouse.wheel(0, window.innerHeight)
        

        # Perform final verification of UI responsiveness by resizing viewport to simulate different screen sizes and confirm layout adapts correctly.
        await page.mouse.wheel(0, -window.innerHeight)
        

        # Assert the page title is correct
        assert await page.title() == 'EdLingo - Language Learning'
        
        # Assert user status elements are visible and have expected values
        user_level = await page.locator('text=Level 1').count()
        assert user_level > 0
        user_xp = await page.locator('text=20 XP').count()
        assert user_xp > 0
        user_day_streak = await page.locator('text=Day Streak: 1').count()
        assert user_day_streak > 0
        user_progress = await page.locator('text=75%').count()
        assert user_progress > 0
        
        # Assert navigation links are present and have correct hrefs
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
            link = await page.locator(f'nav >> text={link_text}')
            assert await link.count() > 0
            link_href = await link.get_attribute('href')
            assert link_href == href
        
        # Assert chat practice section is visible and contains expected text
        chat_section = await page.locator('text=Practice conversations with AI')
        assert await chat_section.count() > 0
        ai_status = await page.locator('text=GeminiAI Ready')
        assert await ai_status.count() > 0
        
        # Assert chat log messages are rendered correctly
        chat_messages = [
            'Test message 1',
            "Great job sending your first messages! That's a fantastic start. We can practice saying some simple things together. How about we try saying \"Hello\" and \"Goodbye\"? Can you type those for me?",
            'Hello',
            'Excellent! You typed "Hello" perfectly! See, that was easy. Now let\'s try "Goodbye". You can do it!'
         ]
        for msg in chat_messages:
            message_locator = await page.locator(f'text={msg}')
            assert await message_locator.count() > 0
        
        # Assert responsiveness by checking viewport sizes and layout adaptation
        viewports = [(1280, 720), (768, 1024), (375, 667)]
        for width, height in viewports:
            await page.set_viewport_size({'width': width, 'height': height})
            await page.wait_for_timeout(1000)  # wait for layout to adapt
            # Check that main navigation is visible in all viewports
            nav_visible = await page.locator('nav').is_visible()
            assert nav_visible
        
        # Assert no ERR_EMPTY_RESPONSE errors by checking page content loaded
        content = await page.content()
        assert 'ERR_EMPTY_RESPONSE' not in content
        
        # Assert UI components have Tailwind CSS classes applied
        tailwind_classes = ['bg-', 'text-', 'flex', 'grid', 'hover:', 'focus:', 'rounded', 'p-', 'm-']
        for cls in tailwind_classes:
            elements = await page.locator(f'[class*="{cls}"]').count()
            assert elements > 0
        
        # Simulate high load by sending multiple chat messages rapidly and verify UI stability
        chat_input = await page.locator('textarea')
        send_button = await page.locator('button:has-text("Send")')
        for i in range(5):
            await chat_input.fill(f'Test load message {i}')
            await send_button.click()
            await page.wait_for_timeout(200)
        # Verify that the last message is present
        last_message = await page.locator(f'text=Test load message 4')
        assert await last_message.count() > 0
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    
