import uuid
from datetime import datetime, timezone
from enum import Enum

from pydantic import EmailStr
from sqlmodel import DateTime
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


class GenderEnum(str, Enum):
    male = "male"
    female = "female"
    other = "other"


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
    analysis_records: list["AnalysisRecord"] | None = Relationship(back_populates="user", cascade_delete=True)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class AnalysisRecord(SQLModel, table=True):
    __tablename__ = "analysis_records"
    
    record_id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False)
    person_name: str = Field(max_length=50, nullable=False)
    gender: GenderEnum = Field(nullable=False)
    age: int | None = Field(default=None, nullable=True)
    birth_date: datetime | None = Field(default=None, nullable=True)
    remarks: str | None = Field(default=None, nullable=True)
    analysis_result: str | None = Field(default=None, nullable=True)
    text_analysis_result: str | None = Field(default=None, nullable=True)
    audio_analysis_result: str | None = Field(default=None, nullable=True)
    video_analysis_result: str | None = Field(default=None, nullable=True)
    record_time: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    
    user: User | None = Relationship(back_populates="analysis_records")
    files: list["File"] | None = Relationship(back_populates="record", cascade_delete=True)


class File(SQLModel, table=True):
    __tablename__ = "files"
    
    file_id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    record_id: uuid.UUID = Field(foreign_key="analysis_records.record_id", nullable=False)
    file_name: str = Field(max_length=255, nullable=False)
    file_path: str = Field(max_length=255, nullable=False)
    file_size: int | None = Field(default=None, nullable=True)
    file_type: str | None = Field(default=None, max_length=50, nullable=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    
    record: AnalysisRecord | None = Relationship(back_populates="files")


class AnalysisRecordBase(SQLModel):
    person_name: str = Field(max_length=50)
    gender: GenderEnum
    age: int | None = None
    birth_date: datetime | None = None
    remarks: str | None = None


class AnalysisRecordCreate(AnalysisRecordBase):
    pass


class AnalysisRecordUpdate(SQLModel):
    person_name: str | None = None
    gender: GenderEnum | None = None
    age: int | None = None
    birth_date: datetime | None = None
    remarks: str | None = None
    analysis_result: str | None = None
    text_analysis_result: str | None = None
    audio_analysis_result: str | None = None
    video_analysis_result: str | None = None


class AnalysisRecordPublic(AnalysisRecordBase):
    record_id: uuid.UUID
    user_id: uuid.UUID
    analysis_result: str | None = None
    text_analysis_result: str | None = None
    audio_analysis_result: str | None = None
    video_analysis_result: str | None = None
    record_time: datetime | None = None
    files: list["FilePublic"] = []


class AnalysisRecordsPublic(SQLModel):
    data: list[AnalysisRecordPublic]
    count: int


class FileBase(SQLModel):
    file_name: str
    file_type: str | None = None


class FileCreate(FileBase):
    record_id: uuid.UUID


class FilePublic(FileBase):
    file_id: uuid.UUID
    record_id: uuid.UUID
    file_path: str
    file_size: int | None = None
    created_at: datetime | None = None


class FilesPublic(SQLModel):
    data: list[FilePublic]
    count: int
