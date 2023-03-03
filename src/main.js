import express from 'express';
import { getPrices as getCurrencyPrices } from './currency.js';
import { getPrices as getFundPrices } from './fund.js';
import fs from 'fs';

const router = express.Router();

String.prototype.thSep = function () { return this.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

const toHMS = intervalSecs => {
  const dateObj = new Date(intervalSecs * 1000);
  const hours = dateObj.getUTCHours();
  const minutes = dateObj.getUTCMinutes();
  const seconds = dateObj.getSeconds();

  const timeStringArray = [];

  if (hours > 0) {
    timeStringArray.push(hours.toString() + ' hours');
  }

  if (minutes > 0) {
    timeStringArray.push(minutes.toString() + ' minutes');
  }

  if (seconds > 0) {
    timeStringArray.push(seconds.toString() + ' seconds');
  }

  return timeStringArray.join(', ');
}

const getPrices = async ({ portfolio }) => {
  let pricesFromFile = {};

  try {
    pricesFromFile = JSON.parse(fs.readFileSync('./data/prices.json'));
  }
  catch {
  }

  const pricesFromWeb = {
    ...await getFundPrices(portfolio.current.filter(fund => fund.type == 'fund').map(fund => fund.code)),
    ...await getCurrencyPrices(portfolio.current.filter(fund => fund.type == 'currency').map(fund => fund.code))
  }

  const prices = {};

  let allPricesUpdated = true;

  Object.keys(pricesFromWeb).forEach(id => {
    if (!pricesFromWeb[id]) {
      allPricesUpdated = false;
      prices[id] = pricesFromFile[id];
    }
    else {
      prices[id] = pricesFromWeb[id];
    }
  });

  const now = new Date();

  if (allPricesUpdated) {
    prices.lastUpdateTime = now.toISOString();
  }
  else {
    prices.lastUpdateTime = pricesFromFile.lastUpdateTime;
  }

  fs.writeFileSync('./data/prices.json', JSON.stringify(prices, null, 2));

  return { prices, allPricesUpdated };
}

const generateResponse = ({ amount, prices, allPricesUpdated, code }) => {
  const ratioTRY = code ? prices[code] : 1;

  return `
    <div style="font-size: 50; text-color: red; font-weight=bold; font-family: Tahoma; width: 50%; margin: 50 auto; text-align: center;">
      ${code ? `Total ${code.toUpperCase()} amount` : `Total amount of all assets`}
    </div>
    ${(code && (['TRY', 'USD', 'EUR', 'XAU'].indexOf(code) < 0)) ? `
        <div style="font-size: 50; font-family: Tahoma; width: 50%; margin: 50 auto; text-align: center;">
          ${amount.toFixed(0).thSep()} ${code.toUpperCase()}
        </div>
      ` : ''
    }
    <div style="font-size: 50; font-family: Tahoma; width: 50%; margin: 50 auto; text-align: center;">
      ${(amount * ratioTRY).toFixed(0).thSep()} TRY
    </div>
    <div style="font-size: 50; font-family: Tahoma; width: 50%; margin: 50 auto; text-align: center;">
      ${(amount * ratioTRY / prices.USD).toFixed(0).thSep()} USD
    </div>
    <div style="font-size: 50; font-family: Tahoma; width: 50%; margin: 50 auto; text-align: center;">
      ${(amount * ratioTRY / prices.EUR).toFixed(0).thSep()} EUR
    </div>
    <div style="font-size: 50; font-family: Tahoma; width: 50%; margin: 50 auto; text-align: center;">
      ${(amount * ratioTRY / prices.XAU).toFixed(2).thSep()} XAU
    </div>
    <div style="font-size: 12; font-family: Tahoma; width: 50%; margin: 50 auto; text-align: center;">
      ${prices.lastUpdateTime ? (
      allPricesUpdated
        ? `Prices are updated now.`
        : `Prices are last updated on ${new Date(prices.lastUpdateTime).toDateString()} ${new Date(prices.lastUpdateTime).toLocaleTimeString()}<p>`
        + `${toHMS((now - new Date(prices.lastUpdateTime)) / 1000)} ago`
    )
      : `Prices were never updated.`}
    </div>
    <div style="font-size: 12; font-family: Tahoma; width: 50%; margin: 50 auto; text-align: center;">
      Call GET /set?type=AAA&code=XXX&amount=YYY to set an asset to a value. type parameter is required only for new assets.
      <p>
      To get amount of a specific asset, call GET /code=XXX
      <p>
      To add or remove value to an asset, send amount parameter as "[XXX]" or [-XXX].
      <p>
      Set amount to 0 to delete an asset.
    </div>
  `;
}

router.get('/', async (req, res) => {
  const portfolio = JSON.parse(fs.readFileSync('./data/portfolio.json'));
  const pricesResponse = await getPrices({ portfolio });

  let amount;
  if (req.query.code) {
    const existingFundIndex = portfolio.current.findIndex(fund => fund.code == req.query.code);
    amount = portfolio.current[existingFundIndex].amount;
  }
  else {
    amount = portfolio.current.reduce((acc, cur) => acc + pricesResponse.prices[cur.code] * cur.amount, 0);
  }

  res.status(200).send(generateResponse({
    amount,
    prices: pricesResponse.prices,
    allPricesUpdated: pricesResponse.allPricesUpdated,
    code: req.query.code
  }));
});

router.get('/set', async (req, res) => {
  const portfolio = JSON.parse(fs.readFileSync('./data/portfolio.json'));

  const existingFundIndex = portfolio.current.findIndex(fund => fund.code == req.query.code);
  if (existingFundIndex < 0) {
    if (!req.query.type) {
      res.status(200).send(`This is a new fund in the portfolio. Send a type parameter with a "currency" or "fund" value.`);
      return;
    }
    else {
      portfolio.current.push({
        type: req.query.type,
        code: req.query.code,
        amount: req.query.amount
      });
    }
  }
  else {
    const matches = req.query.amount.match(/\[([\+\-])?([0-9]+)\]/);
    if (matches) {
      portfolio.current[existingFundIndex].amount += (matches[1] == '-' ? -1 : 1) * parseInt(matches[2]);
      fs.writeFileSync('./data/portfolio.json', JSON.stringify(portfolio, null, 2));
      res.status(200).send(`${req.query.code} amount is ${matches[1] == '-' ? `decreased by` : `increased by`} ${matches[2]}.`);
    }
    else if (req.query.amount == '0') {
      portfolio.current.splice(existingFundIndex, 1);
      fs.writeFileSync('./data/portfolio.json', JSON.stringify(portfolio, null, 2));
      res.status(200).send(`${req.query.code} assets are cleared.`);
    }
    else {
      portfolio.current[existingFundIndex].amount = req.query.amount;
      fs.writeFileSync('./data/portfolio.json', JSON.stringify(portfolio, null, 2));
      res.status(200).send(`${req.query.code} amount is set to ${req.query.amount}.`);
    }
  }
});

export default router;
