const util = require('util');
const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();
process.env.TZ = "Europe/Moscow";

const sequelize = new Sequelize('TrashSensor', process.env.DB_USER, process.env.DB_PASS, {
    host: 'localhost',
    dialect: 'postgres',
    schema: 'sensors',
    logging: false
});

const Sensor = sequelize.define('Sensor', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    lat: {
        type: DataTypes.FLOAT,
        allowNull: false,
        unique: true,
    },
    lng: {
        type: DataTypes.FLOAT,
        allowNull: false,
        unique: true,
    }
});

const FullnessData = sequelize.define('FullnessData', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    containerNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    percent: {
        type: DataTypes.INTEGER,
    },
    batLevel: {
        type: DataTypes.INTEGER,
    }
},
    // {
    //     timestamps: false
    // }
);

const DoorData = sequelize.define('DoorData', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    containerNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    isOpened: {
        type: DataTypes.BOOLEAN,
    }
},
    // {
    //     timestamps: false
    // }
);

Sensor.hasMany(FullnessData, { as: "FullnessData" });
FullnessData.belongsTo(Sensor, { as: "Sensor" });

Sensor.hasMany(DoorData, { as: "DoorData" });
DoorData.belongsTo(Sensor, { as: "Sensor" });

//const app = express();
const exp = express();
const app = express.Router(); // Создание экземпляра маршрутизатора для API
exp.use('/api', app);

const port = 1778;

const logging = (req, res, next) => {
    var ip = req.ip;
    console.log("------------------------------------------------------------");

    const curData = new Date();
    //console.log(curData.toISOString())
    console.log(curData.toLocaleString("ru-RU", { timeZone: process.env.TZ }))

    console.log('Request from', ip);
    console.log(`Request received for ${req.method} ${req.url}`);
    console.log(`Request body: ${util.inspect(req.body)}`);

    next();
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(logging);

const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.sendStatus(401);

    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const role = getRole(username, password);
    console.log(role);
    const user = { username: username, role: role };

    const token = jwt.sign(user, secretKey);
    res.json({ token: token });
});

app.get('/', (req, res) => {
    res.send('OK');
});

app.get('/sensors', async (req, res) => {
    try {
        const { _start = 0, _end = 100, _sort = 'createdAt', _order = 'ASC' } = req.query

        const data = await FullnessData.findAll({
            attributes: [
                'id',
                [Sequelize.col('Sensor.name'), 'name'],
                [Sequelize.col('Sensor.address'), 'address'],
                [Sequelize.col('Sensor.lat'), 'lat'],
                [Sequelize.col('Sensor.lng'), 'lng'],
                'percent',
                'batLevel',
            ],
            include: [
                {
                    model: Sensor,
                    as: "Sensor",
                    attributes: [],
                    required: true,
                }
            ],
            order: [[_sort, _order]],
            offset: parseInt(_start),
            limit: parseInt(_end) - parseInt(_start),
        });

        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Expose-Headers', 'X-Total-Count')
        res.header('X-Total-Count', data.length);

        res.json(data);
    } catch (error) {
        console.error('Error fetching data', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/sensors', async (req, res) => {
    try {
        const { _start = 0, _end = 100, _sort = 'createdAt', _order = 'ASC' } = req.query

        const data = await FullnessData.findAll({
            attributes: [
                'id',
                [Sequelize.col('Sensor.name'), 'name'],
                [Sequelize.col('Sensor.address'), 'address'],
                [Sequelize.col('Sensor.lat'), 'lat'],
                [Sequelize.col('Sensor.lng'), 'lng'],
                'percent',
                'batLevel',
            ],
            include: [
                {
                    model: Sensor,
                    as: "Sensor",
                    attributes: [],
                    required: true,
                }
            ],
            order: [[_sort, _order]],
            offset: parseInt(_start),
            limit: parseInt(_end) - parseInt(_start),
        });

        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Expose-Headers', 'X-Total-Count')
        res.header('X-Total-Count', data.length);

        res.json(data);
    } catch (error) {
        console.error('Error fetching data', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/now', async (req, res) => {
    const sensors = await Sensor.findAll({
        order: [['id', 'ASC']]
    });

    let result = [];
    for (let sens of sensors) {
        for (let i = 0; i < 7; i++) {
            const infoFull = await FullnessData.findOne({
                where: { SensorId: sens.id, containerNumber: i },
                order: [['createdAt', 'DESC']]
            });

            const infoDoor = await DoorData.findOne({
                where: { SensorId: sens.id, containerNumber: i },
                order: [['createdAt', 'DESC']]
            });

            const date = infoFull ? formatDateTime(new Date(infoFull.createdAt)) : '-';

            result.push({
                id: `${sens.id}.${i}`, name: sens.name, address: sens.address,
                lat: sens.lat, lng: sens.lng, percent: infoFull ? infoFull.percent : '-',
                batLevel: infoFull ? infoFull.batLevel : '-', isDoorOpened: infoDoor ? infoDoor.isOpened : '-', timeAt: date
            })
        }
        /* for (let i = 0; i < info.length; i++) {
             const date = new Date(info[i].createdAt)
             result.push({
                 id: `${sens.id}.${info[i].containerNumber}`, name: sens.name, address: sens.address,
                 lat: sens.lat, lng: sens.lng, percent: info[i].percent,
                 batLevel: info[i].batLevel, timeAt: formatDateTime(date)
             })
         }*/


    }
    result.sort((a, b) => b.timeAt - a.timeAt);
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Expose-Headers', 'X-Total-Count')
    res.header('X-Total-Count', result.length);

    res.json(result);
});

app.post('/data', async (req, res) => {
    if (!req.body) return res.sendStatus(400);

    try {
        const info = req.body.data;
        console.log(info);
        const fillLevelRegex = /SN\.SR\.FU\.LL\.(\w+)\.(\w+)\.(\w+)/;
        const doorStatusRegex = /SN\.SR\.DO\.OR\.(\w+)\.(\w+)/;

        if (doorStatusRegex.test(info)) {
            const match = info.match(doorStatusRegex);
            const sensorId = parseInt(match[1], 16);
            const doorStatus = match[2].split('');
            console.log(`ID датчика: ${sensorId}, Состояние дверей: ${doorStatus.join(', ') || 'N/A'}`);
            console.log(doorStatus);

            for (let i = 0; i < doorStatus.length; i++) {
                if (doorStatus[i] == 'x') {
                    continue;
                }

                console.log(i, doorStatus[i]);

                const sensorReady = await Sensor.findOne({
                    where: { id: sensorId },
                });

                if (sensorReady)
                    DoorData.create({ isOpened: doorStatus[i] == 0 ? false : true, SensorId: sensorId, containerNumber: i });
                else
                    res.sendStatus(400);
            }
            res.status(200).json({ data: 'OK' });
        }
        else if (fillLevelRegex.test(info)) {
            const match = info.match(fillLevelRegex);
            const sensorId = parseInt(match[1], 16);
            const fillLevelsHex = match[2].split('');
            const batteryLevelHex = match[3];

            const fillLevelsDec = fillLevelsHex.map(hex => {
                if (hex === 'x') return 'x';
                if (hex === 'e') return -1;
                if (hex === 'f') return 100;
                return parseInt(hex, 16) * 10;
            }); // Фильтрация пустых значений

            const batteryLevelDec = parseInt(batteryLevelHex, 16);

            console.log(`ID датчика: ${sensorId}, Уровни наполненности: ${fillLevelsDec.join('%, ') || 'N/A'}, Заряд батареи: ${batteryLevelDec}%`);

            console.log(fillLevelsDec);

            const sensorReady = await Sensor.findOne({
                where: { id: sensorId },
            });

            if (sensorReady)
                for (let i = 0; i < fillLevelsDec.length; i++) {
                    if (fillLevelsDec[i] == 'x') {
                        continue;
                    }
                    const newData = await FullnessData.create({ percent: fillLevelsDec[i], batLevel: batteryLevelDec, SensorId: sensorId, containerNumber: i });
                }
            else
                res.sendStatus(400);

            res.header('Access-Control-Allow-Origin', '*');
            res.status(200).json({ data: 'OK' });

        } else {
            console.log('Неизвестный формат строки');
            res.sendStatus(400);
        }

    } catch (error) {
        console.error('Error creating', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

sequelize.sync({ alter: true }).then(() => {
    exp.listen(port, '0.0.0.0', () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
});

function formatDateTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}