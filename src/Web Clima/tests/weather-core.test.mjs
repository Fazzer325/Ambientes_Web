import test from 'node:test';
import assert from 'node:assert/strict';
import * as weather from '../weather-core.mjs';

test('buildForecastUrl requests the complete current weather contract', () => {
  const url = new URL(weather.buildForecastUrl({ latitude: 19.4326, longitude: -99.1332 }));

  assert.equal(url.origin + url.pathname, 'https://api.open-meteo.com/v1/forecast');
  assert.equal(url.searchParams.get('latitude'), '19.4326');
  assert.equal(url.searchParams.get('longitude'), '-99.1332');
  assert.equal(
    url.searchParams.get('current'),
    'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m'
  );
  assert.equal(
    url.searchParams.get('daily'),
    'temperature_2m_max,temperature_2m_min,sunrise,sunset'
  );
  assert.equal(url.searchParams.get('timezone'), 'auto');
  assert.equal(url.searchParams.get('forecast_days'), '1');
});

test('describeWeather converts Open-Meteo weather codes into Spanish labels and icons', () => {
  assert.deepEqual(weather.describeWeather(0, true), { label: 'Despejado', icon: 'sun' });
  assert.deepEqual(weather.describeWeather(3, false), { label: 'Cubierto', icon: 'cloud-moon' });
  assert.deepEqual(weather.describeWeather(63, true), { label: 'Lluvia moderada', icon: 'rain' });
  assert.deepEqual(weather.describeWeather(95, false), { label: 'Tormenta eléctrica', icon: 'storm' });
  assert.deepEqual(weather.describeWeather(999, true), { label: 'Condición variable', icon: 'cloud' });
});

test('normalizeWeather shapes the API response for the weather card', () => {
  const response = {
    timezone: 'America/Mexico_City',
    timezone_abbreviation: 'CST',
    current: {
      time: '2026-09-23T08:15',
      temperature_2m: 18.4,
      relative_humidity_2m: 71,
      apparent_temperature: 18.1,
      is_day: 1,
      weather_code: 2,
      wind_speed_10m: 9.7
    },
    daily: {
      temperature_2m_max: [25.8],
      temperature_2m_min: [13.2],
      sunrise: ['2026-09-23T06:26'],
      sunset: ['2026-09-23T18:32']
    }
  };

  assert.deepEqual(weather.normalizeWeather(response), {
    temperature: 18,
    apparentTemperature: 18,
    humidity: 71,
    windSpeed: 10,
    high: 26,
    low: 13,
    observedAt: '08:15',
    sunrise: '06:26',
    sunset: '18:32',
    timezone: 'CST',
    condition: 'Parcialmente nublado',
    icon: 'partly-cloudy'
  });
});

test('normalizeWeather rejects incomplete API responses', () => {
  assert.throws(
    () => weather.normalizeWeather({ current: null, daily: null }),
    /respuesta meteorológica incompleta/i
  );
});
