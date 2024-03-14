import puppeteer from "puppeteer";
import fs from "fs";

function getWebsiteAdresses(filepath: string) {
  const fileContent = fs.readFileSync(filepath, "utf-8");
  return fileContent.split("\n");
}

async function getWebsiteLogoUrl(url: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://" + url);

  const imageNode = await page.$$("img");

  const logoImageTag = imageNode.find(async (node) => {
    const alt = await node
      .getProperty("alt")
      .then((alt) => alt.jsonValue().then((alt) => alt.toString()));

    if (alt.match(/\blogo\b/i)) {
      return true;
    }
  });

  const test = await Promise.all(
    imageNode.map(async (node) => {
      const src = await node.getProperty("src");
      const srcTxt = await src.jsonValue();
      return srcTxt;
    }),
  );

  await browser.close();

  return test;
}

(async () => {
  const websiteAdresses = getWebsiteAdresses("./websites.csv");

  console.log(await getWebsiteLogoUrl(websiteAdresses[20]));
})();
