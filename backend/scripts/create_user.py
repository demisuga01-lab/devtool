from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.auth import get_password_hash  # noqa: E402
from app.core.database import SessionLocal, init_db  # noqa: E402
from app.models.status import User  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a WellFriend DevTools status user.")
    parser.add_argument("--username", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--admin", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    init_db()

    db = SessionLocal()
    try:
        existing = db.query(User).filter((User.username == args.username) | (User.email == args.email)).first()
        if existing:
            raise SystemExit("A user with that username or email already exists.")
        user = User(
            username=args.username,
            email=args.email,
            password_hash=get_password_hash(args.password),
            is_admin=args.admin,
        )
        db.add(user)
        db.commit()
        print(f"Created user {args.username}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
