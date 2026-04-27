import os
from dotenv import load_dotenv

load_dotenv(override=True)

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'buddybot-dev-key')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///buddybot.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # OpenRouter
    OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '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')
    OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'nvidia/nemotron-3-super-120b-a12b:free')
    OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions'

    # Rate Limiting
    RATELIMIT_DEFAULT = "100 per hour"
    RATELIMIT_STORAGE_URL = "memory://"
