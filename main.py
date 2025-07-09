from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi import Request
from pydantic import BaseModel
import yfinance as yf
import openai
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# Define stock universe
NIFTY50_TICKERS = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS"]

app = FastAPI()

# Configure OpenAI (optional - can work without API key for demo)
openai.api_key = os.getenv("OPENAI_API_KEY")

class ScreenerCriteria(BaseModel):
    market_cap_gt: float = None

class DetectiveRequest(BaseModel):
    criteria: ScreenerCriteria

class NaturalLanguageRequest(BaseModel):
    query: str

def get_stock_fundamentals(ticker: str) -> dict:
    try:
        stock = yf.Ticker(ticker)
        return stock.info
    except:
        return {"error": "Invalid ticker or data not found"}

def get_stock_news(ticker: str) -> list:
    try:
        stock = yf.Ticker(ticker)
        news = stock.news
        simplified_news = []
        for article in news:
            simplified_news.append({
                'title': article.get('title'),
                'link': article.get('link')
            })
        return simplified_news
    except:
        return [{"error": "Invalid ticker or data not found"}]

def screen_stocks(criteria: ScreenerCriteria) -> list:
    passed_stocks = []
    for ticker in NIFTY50_TICKERS:
        stock_data = get_stock_fundamentals(ticker)
        if 'marketCap' in stock_data and criteria.market_cap_gt is not None:
            if stock_data['marketCap'] > criteria.market_cap_gt:
                passed_stocks.append(ticker)
        elif criteria.market_cap_gt is None:
            # If no criteria specified, include all stocks
            passed_stocks.append(ticker)
    return passed_stocks

@app.post("/screener")
async def run_screener(criteria: ScreenerCriteria):
    return screen_stocks(criteria)

@app.post("/financial_detective")
async def run_financial_detective(request: DetectiveRequest):
    # Get list of stocks that pass the screening criteria
    passed_stocks = screen_stocks(request.criteria)
    
    # Create results list
    results = []
    
    # Get top 3 stocks only
    top_3_stocks = passed_stocks[:3]
    
    # Loop through top 3 tickers and gather data
    for ticker in top_3_stocks:
        fundamentals = get_stock_fundamentals(ticker)
        news = get_stock_news(ticker)
        
        stock_data = {
            'ticker': ticker,
            'fundamentals': fundamentals,
            'news': news
        }
        results.append(stock_data)
    
    return results

@app.post("/financial_detective_ai")
async def run_financial_detective_ai(request: NaturalLanguageRequest):
    # Parse natural language to criteria
    criteria = parse_natural_language_to_criteria(request.query)
    
    # Get analysis results
    passed_stocks = screen_stocks(criteria)
    results = []
    top_3_stocks = passed_stocks[:3]
    
    for ticker in top_3_stocks:
        fundamentals = get_stock_fundamentals(ticker)
        news = get_stock_news(ticker)
        
        stock_data = {
            'ticker': ticker,
            'fundamentals': fundamentals,
            'news': news
        }
        results.append(stock_data)
    
    # Generate AI summary
    summary = generate_analysis_summary(results)
    
    return {
        "query": request.query,
        "parsed_criteria": criteria.dict(),
        "summary": summary,
        "detailed_results": results
    }

@app.get("/stock_fundamentals/{ticker}")
async def read_stock_fundamentals(ticker: str):
    return get_stock_fundamentals(ticker)

@app.get("/stock_news/{ticker}")
async def read_stock_news(ticker: str):
    return get_stock_news(ticker)

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health")
async def health():
    return {"message": "Financial Detective API is running"}

def parse_natural_language_to_criteria(query: str) -> ScreenerCriteria:
    """Parse natural language query into screening criteria using LLM"""
    try:
        if not openai.api_key:
            # Fallback logic when no OpenAI key is available
            if "large cap" in query.lower() or "big companies" in query.lower():
                return ScreenerCriteria(market_cap_gt=1000000000000)  # 1 trillion
            elif "small cap" in query.lower() or "small companies" in query.lower():
                return ScreenerCriteria(market_cap_gt=100000000000)   # 100 billion
            else:
                return ScreenerCriteria()  # No criteria
        
        # Use OpenAI to parse the query
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": """You are a financial analysis assistant. Parse user queries into screening criteria.
                    Respond with ONLY a JSON object with this structure:
                    {"market_cap_gt": number_or_null}
                    
                    Examples:
                    - "large cap stocks" -> {"market_cap_gt": 1000000000000}
                    - "small companies" -> {"market_cap_gt": 100000000000}
                    - "all stocks" -> {"market_cap_gt": null}
                    """
                },
                {"role": "user", "content": query}
            ],
            max_tokens=100,
            temperature=0
        )
        
        parsed_json = json.loads(response.choices[0].message.content.strip())
        return ScreenerCriteria(market_cap_gt=parsed_json.get("market_cap_gt"))
    
    except Exception as e:
        # Fallback to no criteria on error
        return ScreenerCriteria()

def generate_analysis_summary(results: list) -> str:
    """Generate a summary analysis of the financial detective results"""
    try:
        if not openai.api_key or not results:
            return "Analysis completed. Check the detailed data below."
        
        # Prepare data for analysis
        summary_data = []
        for stock in results:
            ticker = stock['ticker']
            fundamentals = stock['fundamentals']
            news_count = len(stock['news']) if isinstance(stock['news'], list) else 0
            
            summary_data.append({
                "ticker": ticker,
                "marketCap": fundamentals.get('marketCap', 'N/A'),
                "sector": fundamentals.get('sector', 'N/A'),
                "news_articles": news_count
            })
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are a financial analyst. Provide a brief, professional summary of the stock analysis results."
                },
                {
                    "role": "user", 
                    "content": f"Analyze these stocks: {json.dumps(summary_data, indent=2)}"
                }
            ],
            max_tokens=300,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
    
    except Exception as e:
        return f"Analysis completed for {len(results)} stocks. Detailed data available below."

# Setup templates and static files
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")
