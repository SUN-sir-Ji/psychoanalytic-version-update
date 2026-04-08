import uuid
from typing import Any

from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    AnalysisRecord,
    AnalysisRecordCreate,
    AnalysisRecordUpdate,
    File,
    FileCreate,
    Item,
    ItemCreate,
    User,
    UserCreate,
    UserUpdate,
)


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user


# Dummy hash to use for timing attack prevention when user is not found
# This is an Argon2 hash of a random password, used to ensure constant-time comparison
DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        # Prevent timing attacks by running password verification even when user doesn't exist
        # This ensures the response time is similar whether or not the email exists
        verify_password(password, DUMMY_HASH)
        return None
    verified, updated_password_hash = verify_password(password, db_user.hashed_password)
    if not verified:
        return None
    if updated_password_hash:
        db_user.hashed_password = updated_password_hash
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
    return db_user


def create_item(*, session: Session, item_in: ItemCreate, owner_id: uuid.UUID) -> Item:
    db_item = Item.model_validate(item_in, update={"owner_id": owner_id})
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item


def create_analysis_record(
    *, session: Session, record_in: AnalysisRecordCreate, user_id: uuid.UUID
) -> AnalysisRecord:
    db_obj = AnalysisRecord.model_validate(record_in, update={"user_id": user_id})
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_analysis_record(*, session: Session, record_id: uuid.UUID) -> AnalysisRecord | None:
    statement = select(AnalysisRecord).where(AnalysisRecord.record_id == record_id)
    return session.exec(statement).first()


def get_analysis_records(
    *, session: Session, user_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> list[AnalysisRecord]:
    statement = (
        select(AnalysisRecord)
        .where(AnalysisRecord.user_id == user_id)
        .offset(skip)
        .limit(limit)
    )
    return session.exec(statement).all()


def update_analysis_record(
    *, session: Session, db_record: AnalysisRecord, record_in: AnalysisRecordUpdate
) -> AnalysisRecord:
    user_data = record_in.model_dump(exclude_unset=True)
    db_record.sqlmodel_update(user_data)
    session.add(db_record)
    session.commit()
    session.refresh(db_record)
    return db_record


def delete_analysis_record(*, session: Session, record_id: uuid.UUID) -> bool:
    record = get_analysis_record(session=session, record_id=record_id)
    if record:
        session.delete(record)
        session.commit()
        return True
    return False


def create_file(*, session: Session, file_in: FileCreate, file_path: str, file_size: int | None) -> File:
    db_obj = File.model_validate(
        file_in, update={"file_path": file_path, "file_size": file_size}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_files_by_record(*, session: Session, record_id: uuid.UUID) -> list[File]:
    statement = select(File).where(File.record_id == record_id)
    return session.exec(statement).all()


def delete_file(*, session: Session, file_id: uuid.UUID) -> bool:
    file = session.get(File, file_id)
    if file:
        session.delete(file)
        session.commit()
        return True
    return False
