// Get the coordinates by city and state
async function getCoordinates(city, state) {
	// Encode the city and state for use in the URL
	const encodedCity = encodeURIComponent(city);

	// Call the geocoding API
	const response = await fetch(
		`https://geocoding-api.open-meteo.com/v1/search?name=${encodedCity}&count=10&language=en&format=json`
	);
	// Wait for a response in .json format
	const data = await response.json();

	// Filter the results to find a match by city and state
	const match = data.results.find(
		(result) =>
			result.name.toLowerCase() === city.toLowerCase() &&
			result.admin1.toLowerCase() === state.toLowerCase()
	);

	// Log the longitude and latitude for testing purposes
	console.log(match.longitude);
	console.log(match.latitude);

	// Test for if there is a match or not
	if (match) {
		return {
			latitude: match.latitude,
			longitude: match.longitude,
		};
	} else {
		console.error("No matching location found.");
		return {
			error: `Unable to find ${city}, ${state}`,
			coordinates: null,
		};
	}
}

// Function to fetch weather data for a given city and state
async function fetchWeather(city, state) {
	console.log(city + state);

	// Set the address to the "city, state"
	let address = city + ", " + state;
	const coordinates = await getCoordinates(city, state);

	// Check if coordinates were successfully retrieved
	if (!coordinates) {
		console.error("Error: Unable to retrieve coordinates for the address.");
		return null;
	}

	// Build the API URL with the required parameters
	const baseUrl = "https://api.open-meteo.com/v1/forecast";
	const params = new URLSearchParams({
		latitude: coordinates.latitude,
		longitude: coordinates.longitude,
		daily: [
			"weather_code",
			"temperature_2m_max",
			"temperature_2m_min",
			"precipitation_probability_max",
		],
		timeformat: "unixtime",
		timezone: "auto",
	});

	const url = `${baseUrl}?${params.toString()}`;

	// Try getting a response with the URL and return in .json format
	try {
		const response = await fetch(url);
		const data = await response.json();
		return data.daily;
	} catch (error) {
		console.error("Error fetching weather data:", error);
		return null;
	}
}

// Update the weather table in the HTML code
function updateWeatherTable(cityId, forecastData, degreeUnit) {
	// Log in the console for testing purposes
	console.log(`Updating weather table for ${cityId}`);

	// Update for each of the 5 days
	forecastData.time.forEach((unixTimestamp, index) => {
		if (index < 5) {
			// Get the current day of the week with the unix timestamp
			const date = new Date(unixTimestamp * 1000);
			const localDate = new Date(
				date.getTime() + date.getTimezoneOffset() * 60000
			);

			// Set the day of the week to the longhand version ("Monday" rather than "Mon")
			const options = { weekday: "long" };
			const dayOfTheWeek = new Intl.DateTimeFormat("en-US", options).format(
				localDate
			);

			// Set the current day of the week
			const dayOfTheWeekElement = document.getElementById(
				`${cityId}dotw${index}`
			);
			// Set the current high temp
			const highTempElement = document.getElementById(
				`${cityId}dotwHigh${index}`
			);
			// Set the current low temp
			const lowTempElement = document.getElementById(
				`${cityId}dotwLow${index}`
			);
			// Set the current probability of percipitation
			const percipProbElement = document.getElementById(
				`${cityId}dotwRain${index}`
			);
			// Set the current weather icon
			const outlookElement = document.getElementById(
				`${cityId}dotwOut${index}`
			);

			// Display the day of the week
			if (dayOfTheWeekElement) dayOfTheWeekElement.textContent = dayOfTheWeek;
			// Display the degrees in celcius if that is what was selected
			if (degreeUnit === "C") {
				if (highTempElement)
					highTempElement.textContent =
						(forecastData.temperature_2m_max[index]).toFixed(1) + "º";
				if (lowTempElement)
					lowTempElement.textContent =
						(forecastData.temperature_2m_min[index]).toFixed(1) + "º";
			} else {
				// Display the degrees in fahrenheit if that is what was selected
				let degreeFHigh = (forecastData.temperature_2m_max[index] * (9 / 5) + 32).toFixed(1);
				let degreeFLow = (forecastData.temperature_2m_min[index] * (9 / 5) + 32).toFixed(1);

				if (highTempElement) highTempElement.textContent = degreeFHigh + "º";
				if (lowTempElement) lowTempElement.textContent = degreeFLow + "º";
			}
			// Display the percipitation probability
			if (percipProbElement)
				percipProbElement.textContent =
					forecastData.precipitation_probability_max[index] + "%";
			// Display the weather icon
			if (outlookElement)
				outlookElement.innerHTML = weatherCodeToImage(
					forecastData.weather_code[index]
				);
		}
	});

	// Make the forecast div visible
	document.getElementById("forecast").hidden = false;
}

// Convert the weather code to the icon
function weatherCodeToImage(code) {
	// Log the code for testing purposes
	console.log(code);
	// Map the code to the icon
	const codeToImageMap = {
		95: "thunderstorm.png",
		85: "snowstorm.png",
		56: "snowing.png",
		51: "raining.png",
		45: "fog.png",
		1: "overcast.png",
		0: "normalweather.png",
	};

	// Find the correct image based on the code ranges
	let imageName = "normalweather.png"; // Default image if no code matches
	if (code >= 95) imageName = codeToImageMap[95];
	else if (code >= 85) imageName = codeToImageMap[85];
	else if (code >= 56) imageName = codeToImageMap[56];
	else if (code >= 51) imageName = codeToImageMap[51];
	else if (code >= 45) imageName = codeToImageMap[45];
	else if (code >= 1) imageName = codeToImageMap[1];
	else imageName = codeToImageMap[0];

	// Return the icon
	return `<img src="./outlook_icons/${imageName}" />`;
}

// Load in the content before running anything
document.addEventListener("DOMContentLoaded", (event) => {
	// Event listener for the form submission
	document
		.getElementById("locationForm")
		.addEventListener("submit", async (event) => {
			event.preventDefault(); // Prevent the form from submitting the traditional way

			// Get the values from the form inputs
			const city1 = document.getElementById("city1").value;
			const state1 = document.getElementById("state1").value;
			const city2 = document.getElementById("city2").value;
			const state2 = document.getElementById("state2").value;
			const degreeUnit = document.querySelector(
				'input[name="degreeUnit"]:checked'
			).value;

			// Validate city names
			if (!city1 || !city2) {
				alert("Please enter the names of both cities.");
				return;
			}

			// Set the address to "city, state"
			let address = city1 + ", " + state1;
			// Fetch the weather data for both cities
			document.getElementById("cityName1").innerText = address;
			address = city2 + ", " + state2;
			document.getElementById("cityName2").innerText = address;

			// Get the coordinates of each of the locations
			const resultCity1 = await getCoordinates(city1, state1);
			const resultCity2 = await getCoordinates(city2, state2);

			// Check if the coordinates were fetched successfully
			if (resultCity1.error) {
				alert(resultCity1.error);
				return;
			}
			if (resultCity2.error) {
				alert(resultCity2.error);
				return;
			}

			// Fetch the weather of the two cities
			const weatherCity1 = await fetchWeather(city1, state1);
			const weatherCity2 = await fetchWeather(city2, state2);

			// Check if the data was fetched successfully
			if (!weatherCity1 || !weatherCity2) {
				alert("Unable to locate one or both of the cities.");
				return;
			}

			// Update the HTML with the fetched data
			updateWeatherTable("city1", weatherCity1, degreeUnit);
			updateWeatherTable("city2", weatherCity2, degreeUnit);

			// Show the forecast div
			document.getElementById("forecast").style.display = "block";
		});
});
