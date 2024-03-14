import puppeteer, { ElementHandle, JSHandle } from "puppeteer";
import fs from "fs";

//helps to filter the array with async predicate functions
const asyncFilter = async <T>(
  arr: T[],
  predicate: (node: T) => Promise<boolean>,
) =>
  Promise.all(arr.map(predicate)).then((results) =>
    arr.filter((_v, index) => results[index]),
  );

function getWebsiteAdresses(filepath: string) {
  const fileContent = fs.readFileSync(filepath, "utf-8");
  return fileContent.split("\n");
}

async function getWebsiteLogoUrl(url: string) {
  const browser = await puppeteer.launch();
  //this fixes the error: net::ERR_HTTP2_PROTOCOL_ERROR
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36";
  const page = await browser.newPage();
  await page.setUserAgent(userAgent);
  await page.goto("https://" + url, { waitUntil: "domcontentloaded" });

  const imageNodes = await page.$$("img");

  const test = await asyncFilter(imageNodes, async (node) => {
    const [className, alt] = await Promise.all([
      node
        .getProperty("className")
        .then((alt) => alt.jsonValue().then((alt) => alt.toString())),
      node
        .getProperty("alt")
        .then((alt) => alt.jsonValue().then((alt) => alt.toString())),
    ]);

    return /logo/i.test(className) || /logo/i.test(alt);
  });

  const links = await Promise.all(
    test.map(async (node) => {
      const src = await node.getProperty("src");
      const srcTxt = await src.jsonValue();
      return srcTxt;
    }),
  );

  await browser.close();

  return links;
}

(async () => {
  const websiteAdresses = getWebsiteAdresses("./websites.csv");

  for (const website of websiteAdresses) {
    const links = await getWebsiteLogoUrl(website);
    console.log(`website: ${website}, links: ${links.join(" ")}`);

    fs.appendFile(
      "./mynewfile1.txt",
      website + ", " + links.join(", ") + "\n",
      function(err) {
        if (err) throw err;
        console.log("Saved!");
      },
    );
  }
})();
