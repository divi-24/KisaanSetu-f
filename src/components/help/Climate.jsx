import React, { useState } from 'react';
import { WiHumidity, WiBarometer, WiStrongWind, WiThermometer, WiSunrise, WiSunset, WiCloudyGusts } from 'react-icons/wi';
import { Search } from 'lucide-react';

const API_KEY = '3c39dd8447beb9c1548b28b78b602a26';

const fetchData = async (URL) => {
  const response = await fetch(`${URL}&appid=${API_KEY}`);
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

const url = {
  currentWeather: (lat, lon) =>
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric`,
  airPollution: (lat, lon) =>
    `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}`,
  forecast: (lat, lon) =>
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric`,
  geocoding: (query) => `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5`,
};

const getDate = (dateUnix, timezone) => {
  const date = new Date((dateUnix + timezone) * 1000);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const getTime = (timeUnix, timezone) => {
  const date = new Date((timeUnix + timezone) * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function Climate() {
  // State variables
  const [loading, setLoading] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [disasterAlerts, setDisasterAlerts] = useState([]);
  const [currentWeather, setCurrentWeather] = useState([]);
  const [airQualityIndex, setAirQualityIndex] = useState(null);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [debounceTimeout, setDebounceTimeout] = useState(null);

  const fetchWeatherData = async (lat, lon) => {
    setLoading(true);
    setError(false);
    try {
      const [current, airPollution, forecast] = await Promise.all([
        fetchData(url.currentWeather(lat, lon)),
        fetchData(url.airPollution(lat, lon)),
        fetchData(url.forecast(lat, lon)),
      ]);

      setWeatherData(current);
      setAirQualityIndex(airPollution.list[0]?.main.aqi || null);

      const now = new Date();
      const cutoffTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const next24HoursForecast = forecast.list.filter(entry => 
        new Date(entry.dt * 1000) <= cutoffTime
      );

      setCurrentWeather(next24HoursForecast);
      setForecastData(forecast.list.filter((_, i) => i % 8 === 0));
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    clearTimeout(debounceTimeout);
    if (!value) return setSuggestions([]);

    setDebounceTimeout(setTimeout(async () => {
      try {
        const locations = await fetchData(url.geocoding(value));
        setSuggestions(locations);
      } catch (err) {
        console.error('Geocoding error:', err);
        setSuggestions([]);
      }
    }, 500));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!suggestions.length) return;
    handleSuggestionClick(suggestions[0]);
  };

  const handleSuggestionClick = (location) => {
    const { lat, lon, name, state, country } = location;
    setSelectedLocation(`${name}${state ? `, ${state}` : ''}, ${country}`);
    setSearchTerm('');
    setSuggestions([]);
    fetchWeatherData(lat, lon);
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        fetchWeatherData(coords.latitude, coords.longitude);
        setSelectedLocation('Your Current Location');
      },
      (err) => {
        console.error(err);
        setError(true);
        setLoading(false);
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-blue-100 to-green-100 p-5 w-full mt-14">
      <div className="w-full max-w-4xl mb-1 mt-24 relative">
        <form onSubmit={handleFormSubmit} className="flex w-full mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            className="p-4 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            placeholder="Search location..."
          />
          <button
            type="submit"
            className="p-4 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 transition"
          >
            <Search className="w-6 h-6" />
          </button>
        </form>

        {suggestions.length > 0 && (
          <div className="absolute bg-white shadow-lg rounded-lg w-full z-10">
            {suggestions.map((loc, i) => (
              <div
                key={i}
                className="p-3 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSuggestionClick(loc)}
              >
                {`${loc.name}${loc.state ? `, ${loc.state}` : ''}, ${loc.country}`}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleCurrentLocation}
          className="w-full p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 mt-4"
        >
          Use Current Location
        </button>
      </div>

      {loading && <p className="text-blue-500">Loading...</p>}
      {error && <p className="text-red-500">Error loading data</p>}

      {weatherData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-3xl font-bold text-center mb-4">{selectedLocation}</h2>
            <div className="flex flex-col items-center">
              <img
                src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@4x.png`}
                alt={weatherData.weather[0].description}
                className="w-32 h-32 mb-4"
              />
              <p className="text-6xl font-semibold mb-2">
                {Math.round(weatherData.main.temp)}°C
              </p>
              <p className="text-xl text-gray-600 capitalize">
                {weatherData.weather[0].description}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-2xl font-semibold mb-4 text-center">Current Conditions</h3>
            <div className="grid grid-cols-2 gap-4">
              <WeatherDetail icon={WiHumidity} label="Humidity" value={`${weatherData.main.humidity}%`} />
              <WeatherDetail icon={WiThermometer} label="Feels Like" value={`${Math.round(weatherData.main.feels_like)}°C`} />
              <WeatherDetail icon={WiStrongWind} label="Wind Speed" value={`${Math.round(weatherData.wind.speed * 3.6)} km/h`} />
              <WeatherDetail icon={WiBarometer} label="Pressure" value={`${weatherData.main.pressure} hPa`} />
              <WeatherDetail icon={WiSunrise} label="Sunrise" value={getTime(weatherData.sys.sunrise, weatherData.timezone)} />
              <WeatherDetail icon={WiSunset} label="Sunset" value={getTime(weatherData.sys.sunset, weatherData.timezone)} />
              <WeatherDetail 
                icon={WiCloudyGusts} 
                label="Air Quality" 
                value={airQualityIndex !== null ? airQualityIndex : 'N/A'} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Forecast sections remain similar */}
      {disasterAlerts && disasterAlerts.length > 0 ? (
        <div className="mt-8 w-full max-w-4xl bg-red-100 rounded-xl shadow-lg p-6 transition duration-300 hover:shadow-xl">
          <h3 className="text-2xl font-semibold mb-4 text-center text-red-800">Disaster Alerts</h3>
          <div className="space-y-4">
            {disasterAlerts.map((alert, index) => (
              <div key={index} className="p-4 bg-red-200 rounded-lg">
                <p className="font-semibold text-lg text-red-800">{alert.title}</p>
                <p className="text-sm text-red-700">{alert.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 w-full max-w-4xl bg-green-100 rounded-xl shadow-lg p-6 transition duration-300 hover:shadow-xl">
          <h3 className="text-2xl font-semibold mb-4 text-center text-green-800">No Threats for Now</h3>
          <p className="text-center text-green-700">Currently, there are no disaster alerts for this location.</p>
        </div>
      )}
    </div>
  );
}

function WeatherDetail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center space-x-2">
      <Icon className="w-8 h-8 text-blue-500" />
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}