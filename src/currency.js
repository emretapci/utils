import fetch from 'node-fetch';
import htmlParser from 'node-html-parser';

export const getPrices = async currencyIds => {
  const html = await fetch('https://www.qnbfinansbank.enpara.com/hesaplar/doviz-ve-altin-kurlari');
  const rootHtml = htmlParser.parse(await html.text());

  return currencyIds.map(type => ({
    type,
    buy: parseFloat(rootHtml.querySelectorAll('div.enpara-gold-exchange-rates__table div.enpara-gold-exchange-rates__table-item')
      .filter(node => node.querySelectorAll('span')[0].rawText.startsWith(type == 'XAU' ? 'Altın' : type))[0]
      .querySelectorAll('span')[1].childNodes[0].rawText.replace('.','').replace(',', '.')),
    sell: parseFloat(rootHtml.querySelectorAll('div.enpara-gold-exchange-rates__table div.enpara-gold-exchange-rates__table-item')
      .filter(node => node.querySelectorAll('span')[0].rawText.startsWith(type == 'XAU' ? 'Altın' : type))[0]
      .querySelectorAll('span')[2].childNodes[0].rawText.replace('.','').replace(',', '.'))
    })).reduce((acc, cur) => {
      acc[cur.type] = (cur.buy + cur.sell) / 2;
      return acc;
    }, {});
}
