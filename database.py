import sqlite3
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "database.db"

class Database:
    def __init__(self):
        self._init_db()

    def _get_connection(self):
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY,
                    first_name TEXT NOT NULL,
                    username TEXT,
                    subscription_end TIMESTAMP,
                    gift_received INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_banned INTEGER DEFAULT 0,
                    is_premium INTEGER DEFAULT 0,
                    premium_until TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_tokens (
                    user_id INTEGER PRIMARY KEY,
                    token TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS payments_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    amount INTEGER,
                    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS premium_purchases (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    amount INTEGER,
                    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
            return dict(row) if row else None

    def create_user(self, user_id: int, first_name: str, username: str = None):
        subscription_end = datetime.now() + timedelta(days=3)
        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO users (user_id, first_name, username, subscription_end, gift_received)
                VALUES (?, ?, ?, ?, 1)
            """, (user_id, first_name, username, subscription_end))
            conn.commit()
            return subscription_end

    def is_subscription_active(self, user_id: int) -> bool:
        with self._get_connection() as conn:
            row = conn.execute("""
                SELECT (subscription_end > datetime('now') OR (is_premium = 1 AND premium_until > datetime('now'))) as is_active 
                FROM users WHERE user_id = ?
            """, (user_id,)).fetchone()
            return row['is_active'] == 1 if row else False

    def get_subscription_end(self, user_id: int) -> Optional[datetime]:
        with self._get_connection() as conn:
            row = conn.execute("SELECT subscription_end FROM users WHERE user_id = ?", (user_id,)).fetchone()
            if row and row['subscription_end']:
                return datetime.fromisoformat(row['subscription_end'])
            return None

    def get_all_users(self) -> list:
        with self._get_connection() as conn:
            rows = conn.execute("SELECT user_id FROM users").fetchall()
            return [row['user_id'] for row in rows]

    def get_user_count(self) -> int:
        with self._get_connection() as conn:
            row = conn.execute("SELECT COUNT(*) as count FROM users").fetchone()
            return row['count']

    def is_user_banned(self, user_id: int) -> bool:
        with self._get_connection() as conn:
            row = conn.execute("SELECT is_banned FROM users WHERE user_id = ?", (user_id,)).fetchone()
            return row['is_banned'] == 1 if row else False

    def ban_user(self, user_id: int):
        with self._get_connection() as conn:
            conn.execute("UPDATE users SET is_banned = 1 WHERE user_id = ?", (user_id,))
            conn.commit()

    def unban_user(self, user_id: int):
        with self._get_connection() as conn:
            conn.execute("UPDATE users SET is_banned = 0 WHERE user_id = ?", (user_id,))
            conn.commit()

    def activate_premium(self, user_id: int, days: int = 30):
        premium_until = datetime.now() + timedelta(days=days)
        with self._get_connection() as conn:
            conn.execute("""
                UPDATE users SET is_premium = 1, premium_until = ? WHERE user_id = ?
            """, (premium_until, user_id))
            conn.commit()

    def disable_premium(self, user_id: int):
        with self._get_connection() as conn:
            conn.execute("""
                UPDATE users SET is_premium = 0, premium_until = NULL WHERE user_id = ?
            """, (user_id,))
            conn.commit()

    def check_premium_active(self, user_id: int) -> bool:
        with self._get_connection() as conn:
            row = conn.execute("""
                SELECT (is_premium = 1 AND premium_until > datetime('now')) as is_active 
                FROM users WHERE user_id = ?
            """, (user_id,)).fetchone()
            return row['is_active'] == 1 if row else False

    def get_user_token(self, user_id: int) -> Optional[str]:
        with self._get_connection() as conn:
            row = conn.execute("SELECT token FROM user_tokens WHERE user_id = ?", (user_id,)).fetchone()
            return row['token'] if row else None

    def save_user_token(self, user_id: int, token: str):
        with self._get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO user_tokens (user_id, token)
                VALUES (?, ?)
            """, (user_id, token))
            conn.commit()

    def log_payment(self, user_id: int, amount: int):
        with self._get_connection() as conn:
            conn.execute("INSERT INTO payments_log (user_id, amount) VALUES (?, ?)", (user_id, amount))
            conn.commit()

    def log_premium_purchase(self, user_id: int, amount: int):
        with self._get_connection() as conn:
            conn.execute("INSERT INTO premium_purchases (user_id, amount) VALUES (?, ?)", (user_id, amount))
            conn.commit()

    def get_stats(self) -> dict:
        with self._get_connection() as conn:
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            week_ago = today - timedelta(days=7)
            month_ago = today - timedelta(days=30)

            total_users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            today_users = conn.execute("SELECT COUNT(*) FROM users WHERE created_at >= ?", (today,)).fetchone()[0]
            week_users = conn.execute("SELECT COUNT(*) FROM users WHERE created_at >= ?", (week_ago,)).fetchone()[0]
            month_users = conn.execute("SELECT COUNT(*) FROM users WHERE created_at >= ?", (month_ago,)).fetchone()[0]

            today_payments = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM payments_log WHERE date >= ?", (today,)).fetchone()[0]
            week_payments = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM payments_log WHERE date >= ?", (week_ago,)).fetchone()[0]
            month_payments = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM payments_log WHERE date >= ?", (month_ago,)).fetchone()[0]
            total_payments = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM payments_log").fetchone()[0]

            today_sales = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM premium_purchases WHERE date >= ?", (today,)).fetchone()[0]
            week_sales = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM premium_purchases WHERE date >= ?", (week_ago,)).fetchone()[0]
            month_sales = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM premium_purchases WHERE date >= ?", (month_ago,)).fetchone()[0]
            total_sales = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM premium_purchases").fetchone()[0]

            return {
                "total_users": total_users,
                "today_users": today_users,
                "week_users": week_users,
                "month_users": month_users,
                "today_payments": today_payments,
                "week_payments": week_payments,
                "month_payments": month_payments,
                "total_payments": total_payments,
                "today_sales": today_sales,
                "week_sales": week_sales,
                "month_sales": month_sales,
                "total_sales": total_sales,
            }

db = Database()
