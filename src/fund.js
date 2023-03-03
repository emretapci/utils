import fetch from 'node-fetch';
import htmlParser from 'node-html-parser';

export const getPrices = async fundCodes => {
  return (await Promise.all(fundCodes.map(fundCode => new Promise(resolve => {
    fetch(`https://www.tefas.gov.tr/FonAnaliz.aspx?FonKod=${fundCode}`).then(res => {
      res.text().then(res2 => {
        const rootHtml = htmlParser.parse(res2);
        const price = parseFloat(rootHtml.querySelectorAll('ul.top-list li span')[0].childNodes[0].text.replace(',', '.'));
        resolve({
          fundCode,
          price
        });
      });
    }).catch(() => resolve({
      fundCode,
      price: 0
    }))
  })))).reduce((acc, cur) => {
    acc[cur.fundCode] = cur.price;
    return acc;
  }, {});
}
