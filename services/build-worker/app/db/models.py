from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime

DATABASE_URL = "postgresql://devops:devops123@127.0.0.1:5433/deploy_platform"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    github_id = Column(Integer, unique=True, nullable=False)
    github_username = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    credential = relationship("UserCredential", back_populates="user", uselist=False)


class UserCredential(Base):
    __tablename__ = "user_credentials"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    encrypted_access_token = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="credential")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    repo_full_name = Column(String, nullable=False)
    github_webhook_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    repo = Column(String, nullable=False)
    commit_sha = Column(String, nullable=False)
    status = Column(String, nullable=False)
    image_tag = Column(String, nullable=True)
    logs = Column(Text, nullable=True)
    live_url = Column(String, nullable=True)
    critical_vulns = Column(Integer, default=0)
    high_vulns = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)


def init_db():
    Base.metadata.create_all(bind=engine)