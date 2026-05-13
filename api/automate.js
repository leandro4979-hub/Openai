import { launch } from '@lightpanda-io/browser-sdk';

export default async function handler(req, res) {
    // Security check - MUST match the header in your iOS Shortcut
    if (req.headers.authorization !== `Bearer ${process.env.MY_SECRET_KEY}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing URL parameter' });

    try {
        const browser = await launch({
            args: ['--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15']
        });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        
        const result = await page.evaluate(() => {
            return {
                title: document.title,
                text: document.body.innerText.slice(0, 1000)
            };
        });

        await browser.close();
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
