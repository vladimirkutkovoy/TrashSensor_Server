import logo from './logo.svg';
import './App.css';
import React, { useState, useEffect, useRef } from 'react';
import { Table } from 'antd';
import { YMaps, Map, Placemark, GeoObject } from '@pbe/react-yandex-maps';
import axios from 'axios';

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: '10px' },
  { title: 'Название', dataIndex: 'name', key: 'name' },
  { title: 'Адрес', dataIndex: 'address', key: 'address' },
  { title: 'Широта', dataIndex: 'lat', key: 'lat' },
  { title: 'Долгота', dataIndex: 'lng', key: 'lng' },
  { title: 'Заполненность', dataIndex: 'percent', key: 'percent', render: (text) => <span>{text} %</span> },
  { title: 'Уровень батареи', dataIndex: 'batLevel', key: 'batLevel', render: (text) => <span>{text} %</span> },
  { title: 'Время обновления', dataIndex: 'timeAt', key: 'timeAt' },
];

const App = () => {
  const [data, setData] = useState([]);
  const [mark, setMark] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const map = useRef(null);
  const mapState = {
    center: [47.208735 + 0.02, 38.936699 - 0.05],
    zoom: 13,
  };

  const addRoute = (ymaps) => {
    const multiRoute = new ymaps.multiRouter.MultiRoute(
      {
        referencePoints: [
          [47.20669, 38.929113],
          [47.203141, 38.934634]
        ],
        params: {
          routingMode: "pedestrian"
        }
      },
      {
        boundsAutoApply: true
      }
    );

    map.current.geoObjects.add(multiRoute);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('https://trash.skbkit.ru/api/now');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();

    // Обновление данных каждые 5 секунд
    const intervalId = setInterval(fetchData, 5000);

    return () => {
      clearInterval(intervalId); // Очистка интервала при размонтировании компонента
    };
  }, []);

  useEffect(() => {
    let tmp_mark = [];
    for (let i of data) {
      if (i.id.split('.')[1] != 0)
        continue;

      tmp_mark.push(
        <Placemark
          key={i.id}
          geometry={[i.lat, i.lng]}
          options={{
            iconColor: 'green',
          }}
          properties={{
            iconContent: 'М', // пару символов помещается
            hintContent: `Наполненность: ${i.percent}%<br>`,
            balloonContent: `
            id: ${i.id}<br>
            Название: ${i.name}<br>
            Адрес: ${i.address}<br>
            Наполненность: ${i.percent}%<br>
            Уровень батареи: ${i.batLevel}%<br>
            Время обновления: ${i.timeAt}<br>
            `, // добавляем данные
          }}
          modules={['geoObject.addon.balloon', 'geoObject.addon.hint']}
        />
      );
    }
    setMark(tmp_mark);
  }, [data]);

  return (
    <div className="App">
      <h1>Информационная система «TrashSensor» 🚛</h1>
      <div className="container">
        <div className="left">
          <Table
            dataSource={data}
            columns={columns}
            rowKey="id"
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
          />
        </div>
        <div className="right">
          <YMaps>
            <Map defaultState={mapState} width='100%' height='100%'
              modules={["multiRouter.MultiRoute"]}
              onLoad={addRoute}
              instanceRef={map}
            >
              {mark}
              <GeoObject
                geometry={{
                  type: "LineString",
                  coordinates: [
                    [55.76, 37.64],
                    [52.51, 13.38],
                  ],
                }}
                options={{
                  geodesic: true,
                  strokeWidth: 5,
                  strokeColor: "#F008",
                }}
              />
            </Map>
          </YMaps>
        </div>
      </div>
    </div>
  );
};

export default App;
