# Smart India Agri Intelligence System

An integrated agricultural machine learning platform that combines crop recommendation, yield prediction, crop price forecasting, and soil health intelligence in a single Flask-based application. The system uses trained models, interactive dashboards, and dataset-driven insights to support smarter farming, better market planning, and data-backed decision-making.

## Key Features

- Crop recommendation based on season, climate, water source, crop type, farming system, and farm inputs.
- Crop yield prediction using weather, location, and crop-specific data.
- Crop price forecasting with market-aware fallbacks for stable output.
- Soil health dashboard for monitoring agricultural conditions and supporting long-term productivity.
- Unified farmer intelligence view that combines recommendation, yield, revenue, and profit insights.
- Modular project structure with separate model apps for easier maintenance and expansion.

## Tech Stack

- Python
- Flask
- Pandas
- NumPy
- scikit-learn
- Joblib
- XGBoost model support
- HTML, CSS, and JavaScript for the dashboards

## Project Structure

- `app.py` - Main integrated Flask application.
- `CROP RECOMMENDATION MODEL/` - Crop recommendation module and related assets.
- `CROP YIELD MODEL/` - Crop yield prediction module and related assets.
- `CROP PRICE MODEL/` - Crop price prediction module and related assets.
- `SOIL HEALTH DASHBOARD/` - Soil health dashboard module.
- `templates/` and `static/` - Shared frontend files for the root app.

## How It Works

1. The root application loads the crop recommendation, yield, price, and soil health modules.
2. It collects farm and market inputs from the user.
3. It generates a recommended crop, expected yield, predicted market price, and decision summary.
4. It combines those outputs into a unified farmer intelligence result with estimated revenue and profit.

## Installation

1. Clone the repository.
2. Create and activate a virtual environment.
3. Install the dependencies:

```bash
pip install -r requirements.txt
```

## Run the Application

Start the main integrated app from the project root:

```bash
python app.py
```

By default, the integrated app expects the module dashboards to be available on these local ports:

- Crop recommendation: `http://127.0.0.1:5001/`
- Crop yield: `http://127.0.0.1:5002/`
- Crop price: `http://127.0.0.1:5003/`
- Soil health: `http://127.0.0.1:5004/`

You can override those addresses with environment variables if needed:

- `CROP_RECOMMENDATION_URL`
- `CROP_YIELD_URL`
- `CROP_PRICE_URL`
- `SOIL_HEALTH_URL`

## Models and Data

The project uses trained model files and CSV datasets stored inside the module folders. If a trained model is unavailable, the application falls back to safe heuristic logic so the interface still works.

## Notes

- The project is designed for smart farming decision support, not for replacing agronomist advice.
- The integrated app can still operate with partial module availability thanks to built-in fallback logic.
- If you deploy the project, make sure the required model files and datasets are included in the build.

## Goal of the Project

To help farmers and agricultural researchers make faster, more informed decisions about crop selection, yield expectations, market timing, and soil health by combining multiple AI-driven insights in one platform.
