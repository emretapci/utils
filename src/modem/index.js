import express from 'express';
import modem from './modem';

const router = express.Router();

router.use('/', express.static('./frontend/build'));

router.get('/devices', async (req, res) => {
	res.status(200).json(await modem.getDevices());
});

router.get('/filters', async (req, res) => {
	res.status(200).json(await modem.getMacFilters());
});

router.put('/filters', async (req, res) => {
	res.status(200).json(await modem.setMacFilters(req.body));
});

/*
{
	mac: <mac>,
	name: <name>
}
*/
router.put('/name', (req, res) => {
	res.status(200).json(modem.setDeviceName(req.body.mac, req.body.name));
});

/*
{
	mac: <mac>,
	name: <name>
}
returns HTTP 200 for success, 500 for error with error code in body
*/
router.put('/enable', async (req, res) => {
	const responseCode = await modem.enableDevice(req.body.mac);
	if (responseCode == 0)
		res.sendStatus(200);
	else
		res.status(500).json(responseCode);
});

/*
{
	mac: <mac>,
	name: <name>
}
returns HTTP 200 for success, 500 for error with error code in body
*/
router.put('/disable', async (req, res) => {
	const responseCode = await modem.disableDevice(req.body.mac);
	if (responseCode == 0)
		res.sendStatus(200);
	else
		res.status(500).json(responseCode);
});

router.get('/reboot', async (req, res) => {
	res.status(200).json(await modem.reboot());
});

router.get('/reboots', (req, res) => {
	res.status(200).json(checkIP.reboots());
});

router.use('/finance', financeRouter);

export default router;
