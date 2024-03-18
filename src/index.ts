import puppeteer, { Browser, ElementHandle, JSHandle } from "puppeteer";
import fs from "node:fs/promises";
import { parallelProcessor, asyncFilter, deleteFileIfExists } from "./utils";
import { link } from "node:fs";

type WebsiteLogo = {
  url: string;
  logoUrls: string;
};

async function getWebsiteAdresses(filepath: string) {
  const fileContent = await fs.readFile(filepath, "utf-8");
  return fileContent.split("\n");
}

async function getWebsiteLogoUrl(
  url: string,
  browser: Browser,
): Promise<WebsiteLogo> {
  console.log("processing site: ", url);

  const page = await browser.newPage();
  try {
    //This supposedly helps to avoid bot detection
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3419.0 Safari/537.36",
    );
    await page.goto("https://" + url);

    const imageNodes = await page.$$("img");

    const filteredImageTags = await asyncFilter(imageNodes, async (node) => {
      const [className, alt, src] = await Promise.all([
        node
          .getProperty("className")
          .then((alt) => alt.jsonValue().then((alt) => alt.toString())),
        node
          .getProperty("alt")
          .then((alt) => alt.jsonValue().then((alt) => alt.toString())),
        node
          .getProperty("src")
          .then((src) => src.jsonValue().then((src) => src.toString())),
      ]);

      return /logo/i.test(className) || /logo/i.test(alt) || /logo/i.test(src);
    });

    const links = await Promise.all(
      filteredImageTags.map(async (node) => {
        const src = await node.getProperty("src");
        const srcTxt = await src.jsonValue();
        return srcTxt;
      }),
    );

    return {
      url,
      logoUrls: links.length >= 1 ? links[0] : "",
    };
  } catch (error) {
    page.close();
    console.error(`error processing ${url}: ${error}`);
    return {
      url,
      logoUrls: "",
    };
  }
}

(async () => {
  let args = process.argv.slice(3);

  if (args.length !== 1) {
    console.log(args);
    console.error("please provide the number of concurrent websites requests");
    process.exit(1);
  }

  const concurrentRequests = parseInt(args[0]);

  const websiteAdresses = (await getWebsiteAdresses("./websites.csv")).filter(
    (url) => url !== "",
  );

  console.log(
    `processing ${websiteAdresses.length} websites with batch size of ${concurrentRequests}`,
  );

  if (concurrentRequests >= 250) {
    console.log(
      "this number of concurrent requests might use up all your memory or get you rate limited by the websites, are you sure you want to continue? the process will start in 10 seconds",
    );
    console.log("press ctrl+c to cancel");

    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  const browser = await puppeteer.launch({
    //this also supposedly helps to avoid bot detection
    args: [
      "--no-sandbox",
      "--headless",
      "--disable-gpu",
      "--window-size=1920x1080",
    ],
  });
  let startTime = Date.now();
  const links = await parallelProcessor(
    websiteAdresses,
    (url) => getWebsiteLogoUrl(url, browser),
    concurrentRequests,
  );
  let endTime = Date.now();

  let timeElapsed = endTime - startTime;
  console.log(`finished processing in ${timeElapsed / 1000} seconds`);
  browser.close();

  console.log(
    `got ${links.filter((link) => link.logoUrls !== "").length} logos out of ${links.length}`,
  );

  console.log("writing to file");

  await deleteFileIfExists("./logos.csv");

  for (const link of links) {
    await fs.appendFile("./logos.csv", `${link.url},${link.logoUrls}\n`);
  }

  console.log("done writing to file");
})();
