from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import json
import re
import pandas as pd
import os

# Hardcode the Gemini API key
GEMINI_API_KEY = "AIzaSyCjsKucIT7iuVxF3n247rbySb4tTuwwGFM"

# Initialize Google Gemini API with the hardcoded key
genai.configure(api_key=GEMINI_API_KEY)

# Define research prompt template for soil testing labs
field_prompt = (
    "As an expert in location-based services and geospatial data, your task is to provide a precise and accurate list of nearby electrical and electronics shops "
    "for the specified location. Please return the response in a well-structured JSON format. "
    "Each entry should include the shop's name, latitude, longitude, and a direct Google Maps link for easy navigation. "
    "Ensure the JSON output follows this structure: [{'name': 'Shop 1', 'latitude': lat, 'longitude': lon, 'link': 'https://www.google.com/maps/...'}, ...]. "
    "Please make sure the response is clean and contains only the JSON data, without any additional explanations or text."
)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


model = genai.GenerativeModel("gemini-2.0-flash")


def extract_json(text):
    """
    Extract JSON from the response text using regex.
    """
    # Use regex to find a valid JSON block in the response
    json_pattern = r"\{.*\}|\[.*\]"
    match = re.search(json_pattern, text, re.DOTALL)

    if match:
        try:
            # Attempt to parse the JSON
            json_data = json.loads(match.group(0))
            return json_data
        except json.JSONDecodeError:
            # If JSON is invalid, return None
            return None
    else:
        return None


def get_gemini_response(location):
    """
    Send a prompt to Gemini and retrieve the response.
    """
    try:
        # Combine the prompt with the location
        prompt = field_prompt + location

        # Send the prompt to Gemini
        response = model.generate_content(prompt)

        # Return the response text
        return response.text
    except Exception as e:
        # Handle any errors during the API call
        print(f"Error calling Gemini API: {e}")
        return None


# API route to get nearby electrical and electronics shops based on location
@app.route("/find_ee_shops", methods=["POST"])
def find_ee_shops():
    data = request.get_json()

    if not data or "location" not in data:
        return jsonify({"error": "Location not provided"}), 400

    location_input = data["location"]
    response = get_gemini_response(location_input)

    if not response:
        return jsonify({"error": "Failed to retrieve data from Gemini."}), 500

    # Extract JSON from the response text
    json_data = extract_json(response)

    if json_data:
        try:
            # Create a DataFrame for map data (optional for further use)
            map_data = pd.DataFrame(
                {
                    "name": [lab["name"] for lab in json_data],
                    "latitude": [lab["latitude"] for lab in json_data],
                    "longitude": [lab["longitude"] for lab in json_data],
                    "link": [lab["link"] for lab in json_data],
                }
            )

            # Return the JSON response with nearby soil labs
            return jsonify(json_data), 200
        except Exception as e:
            return jsonify({"error": f"Error processing data: {e}"}), 500
    else:
        return jsonify({"error": "No valid JSON found in the response."}), 500


# Run the Flask app
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)  # Set debug=False in production
