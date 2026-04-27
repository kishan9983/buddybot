from datetime import datetime
from functools import wraps

import requests
from flask import (Flask, flash, jsonify, redirect, render_template, request,
                   session, url_for)
from flask_bcrypt import Bcrypt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import Config
from models import ChatHistory, User, db

# ──────────────────────────────────────────────────────────────────────────────
# App Factory
# ──────────────────────────────────────────────────────────────────────────────

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
bcrypt = Bcrypt(app)
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

with app.app_context():
    db.create_all()
    print(f"BuddyBot initialized with model: {app.config['OPENROUTER_MODEL']}")
    print(f"API Key present: {'Yes' if app.config['OPENROUTER_API_KEY'] else 'No'}")


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated


def call_openrouter(messages):
    """Call OpenRouter API and return assistant reply."""
    headers = {
        "Authorization": f"Bearer {app.config['OPENROUTER_API_KEY']}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "BuddyBot"
    }
    payload = {
        "model": app.config['OPENROUTER_MODEL'],
        "messages": messages,
        "max_tokens": 1024,
        "temperature": 0.7
    }
    try:
        print(f"Calling OpenRouter: {app.config['OPENROUTER_BASE_URL']}")
        print(f"Model: {app.config['OPENROUTER_MODEL']}")
        resp = requests.post(
            app.config['OPENROUTER_BASE_URL'],
            json=payload,
            headers=headers,
            timeout=30
        )
        if resp.status_code != 200:
             print(f"OpenRouter Error {resp.status_code}: {resp.text}")
        resp.raise_for_status()
        data = resp.json()
        return data['choices'][0]['message']['content']
    except requests.exceptions.Timeout:
        return "⏳ Request timed out. Please try again."
    except requests.exceptions.HTTPError as e:
        if resp.status_code == 429:
            return "⚠️ Rate limit reached. Please wait a moment before sending another message."
        return f"❌ API error ({resp.status_code}). Please try again later."
    except Exception as e:
        print(f"OpenRouter error: {e}")
        return "❌ I'm having trouble connecting right now. Please try again."


# ──────────────────────────────────────────────────────────────────────────────
# Auth Routes
# ──────────────────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return redirect(url_for('chat_page'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    if 'user_id' in session:
        return redirect(url_for('chat_page'))

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm = request.form.get('confirm_password', '')

        # Validation
        if not name or not email or not password or not confirm:
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        if len(name) < 2:
            return jsonify({'success': False, 'message': 'Name must be at least 2 characters'}), 400
        if '@' not in email or '.' not in email:
            return jsonify({'success': False, 'message': 'Invalid email address'}), 400
        if len(password) < 8:
            return jsonify({'success': False, 'message': 'Password must be at least 8 characters'}), 400
        if password != confirm:
            return jsonify({'success': False, 'message': 'Passwords do not match'}), 400

        # Check existing user
        if User.query.filter_by(email=email).first():
            return jsonify({'success': False, 'message': 'Email already registered'}), 409

        # Create user
        pw_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        user = User(name=name, email=email, password_hash=pw_hash)
        db.session.add(user)
        db.session.commit()

        session['user_id'] = user.id
        session['user_name'] = user.name
        session['user_email'] = user.email
        return jsonify({'success': True, 'redirect': url_for('chat_page')})

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('chat_page'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')

        if not email or not password:
            return jsonify({'success': False, 'message': 'Email and password are required'}), 400

        user = User.query.filter_by(email=email).first()
        if not user or not bcrypt.check_password_hash(user.password_hash, password):
            return jsonify({'success': False, 'message': 'Invalid email or password'}), 401

        session['user_id'] = user.id
        session['user_name'] = user.name
        session['user_email'] = user.email
        return jsonify({'success': True, 'redirect': url_for('chat_page')})

    return render_template('login.html')


@app.route('/logout')
@login_required
def logout():
    session.clear()
    return redirect(url_for('login'))


# ──────────────────────────────────────────────────────────────────────────────
# Chat Routes
# ──────────────────────────────────────────────────────────────────────────────

@app.route('/chat-page')
@login_required
def chat_page():
    user = User.query.get(session['user_id'])
    return render_template('index.html', user=user)


@app.route('/chat', methods=['POST'])
@login_required
@limiter.limit("15 per minute")
def chat():
    data = request.get_json()
    if not data or not data.get('message'):
        return jsonify({'success': False, 'message': 'No message provided'}), 400

    user_message = data['message'].strip()
    if not user_message:
        return jsonify({'success': False, 'message': 'Message cannot be empty'}), 400
    if len(user_message) > 4000:
        return jsonify({'success': False, 'message': 'Message too long (max 4000 characters)'}), 400

    user_id = session['user_id']

    # Save user message
    user_msg = ChatHistory(user_id=user_id, role='user', content=user_message)
    db.session.add(user_msg)
    db.session.commit()

    # Build context (last 20 messages)
    history = ChatHistory.query.filter_by(user_id=user_id).order_by(
        ChatHistory.timestamp.asc()
    ).limit(20).all()

    system_prompt = (
        "You are BuddyBot, a friendly, intelligent, and helpful AI assistant. "
        "You provide clear, accurate, and concise responses. "
        "You are warm, encouraging, and always ready to help with any question."
    )

    messages = [{"role": "system", "content": system_prompt}]
    for h in history:
        messages.append({"role": h.role, "content": h.content})

    # Call OpenRouter
    reply = call_openrouter(messages)

    # Save assistant reply
    bot_msg = ChatHistory(user_id=user_id, role='assistant', content=reply)
    db.session.add(bot_msg)
    db.session.commit()

    return jsonify({
        'success': True,
        'reply': reply,
        'timestamp': bot_msg.timestamp.strftime('%I:%M %p')
    })


@app.route('/chat/history')
@login_required
def chat_history():
    messages = ChatHistory.query.filter_by(
        user_id=session['user_id']
    ).order_by(ChatHistory.timestamp.asc()).all()
    return jsonify({'success': True, 'messages': [m.to_dict() for m in messages]})


@app.route('/chat/clear', methods=['POST'])
@login_required
def clear_chat():
    ChatHistory.query.filter_by(user_id=session['user_id']).delete()
    db.session.commit()
    return jsonify({'success': True, 'message': 'Chat cleared'})


# ──────────────────────────────────────────────────────────────────────────────
# Error Handlers
# ──────────────────────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return render_template('login.html'), 404


@app.errorhandler(429)
def rate_limit_handler(e):
    return jsonify({'success': False, 'message': 'Too many requests. Please slow down.'}), 429


if __name__ == '__main__':
    app.run(debug=True, port=5000)
