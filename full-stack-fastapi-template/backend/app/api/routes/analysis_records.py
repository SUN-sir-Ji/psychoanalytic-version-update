import os
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlmodel import Session

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.models import (
    AnalysisRecord,
    AnalysisRecordCreate,
    AnalysisRecordPublic,
    AnalysisRecordsPublic,
    File,
    FileCreate,
    FilesPublic,
    Message,
    GenderEnum,
)

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/", response_model=AnalysisRecordPublic)
def create_analysis_record(
    *, session: SessionDep, current_user: CurrentUser, record_in: AnalysisRecordCreate
) -> AnalysisRecord:
    return crud.create_analysis_record(
        session=session, record_in=record_in, user_id=current_user.id
    )


@router.post("/{record_id}/simulate-analysis", response_model=AnalysisRecordPublic)
async def simulate_analysis(
    *, session: SessionDep, current_user: CurrentUser, record_id: uuid.UUID
) -> AnalysisRecord:
    from app.core.db import engine
    from sqlmodel import col
    
    record = crud.get_analysis_record(session=session, record_id=record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found")
    if record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    files = crud.get_files_by_record(session=session, record_id=record_id)
    
    text_result = None
    audio_result = None
    video_result = None
    
    for file in files:
        file_type = file.file_type or ""
        file_name = file.file_name.lower()
        
        if "text" in file_type or file_name.endswith((".txt", ".pdf", ".doc", ".docx")):
            text_result = f"""【文本情感分析结果】

姓名：{record.person_name}
性别：{'男' if record.gender == GenderEnum.male else '女' if record.gender == GenderEnum.female else '其他'}
年龄：{record.age}岁

【情感特征分析】
1. 情绪状态：整体情绪稳定，表达较为平和
2. 情感表达：具有一定的情感表达能力，情绪词汇使用较为丰富
3. 心理倾向：表现出积极向上的心理倾向，有一定的心理韧性

【建议】
- 继续保持良好的心理状态
- 建议进行定期的心理健康评估
- 如有需要，可咨询专业心理咨询师"""
            
        elif "audio" in file_type or file_name.endswith((".mp3", ".wav", ".m4a", ".ogg")):
            audio_result = f"""【音频情感分析结果】

姓名：{record.person_name}
性别：{'男' if record.gender == GenderEnum.male else '女' if record.gender == GenderEnum.female else '其他'}
年龄：{record.age}岁

【语音情感特征】
1. 语调特征：语调平稳，语速适中
2. 情感波动：情感表达自然，情绪变化不明显
3. 心理状态：语音中未检测到明显的负面情绪信号

【建议】
- 语音表现显示良好的情绪管理能力
- 建议保持当前的心理状态
- 如感到压力，可通过适当方式放松"""
            
        elif "video" in file_type or file_name.endswith((".mp4", ".mov", ".avi", ".wmv")):
            video_result = f"""【视频情感分析结果】

姓名：{record.person_name}
性别：{'男' if record.gender == GenderEnum.male else '女' if record.gender == GenderEnum.female else '其他'}
年龄：{record.age}岁

【视觉情感分析】
1. 面部表情：表情自然，眼神交流良好
2. 肢体语言：姿态放松，肢体动作协调
3. 情绪状态：情绪表达积极，整体状态良好

【建议】
- 视频分析显示良好的心理健康状态
- 继续保持积极的生活方式
- 建议定期进行心理健康检查"""
    
    if text_result or audio_result or video_result:
        record.text_analysis_result = text_result
        record.audio_analysis_result = audio_result
        record.video_analysis_result = video_result
        
        has_text = "已进行" if text_result else "未上传"
        has_audio = "已进行" if audio_result else "未上传"
        has_video = "已进行" if video_result else "未上传"
        
        record.analysis_result = f"""【综合心理分析报告】

姓名：{record.person_name}
性别：{'男' if record.gender == GenderEnum.male else '女' if record.gender == GenderEnum.female else '其他'}
年龄：{record.age}岁
分析时间：{record.record_time.strftime('%Y-%m-%d %H:%M') if record.record_time else '未知'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【一、文本分析】{has_text}
{text_result if text_result else '（未上传文本文件）'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【二、音频分析】{has_audio}
{audio_result if audio_result else '（未上传录音文件）'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【三、视频分析】{has_video}
{video_result if video_result else '（未上传视频文件）'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【四、综合评估与建议】

整体心理状态评估：
- 情绪稳定性：{('良好' if text_result else '无法评估')}
- 情感表达能力：{('良好' if audio_result else '无法评估')}
- 行为表现：{('良好' if video_result else '无法评估')}

综合建议：
1. 继续保持积极乐观的生活态度
2. 建议定期进行心理健康自评
3. 如出现心理困扰，及时寻求专业帮助
4. 保持良好的社交和家庭支持网络

【报告生成时间】{record.record_time.strftime('%Y-%m-%d %H:%M:%S') if record.record_time else '未知'}
"""
        
        session.add(record)
        session.commit()
        session.refresh(record)
    
    return record


@router.get("/", response_model=AnalysisRecordsPublic)
def get_analysis_records(
    *, session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> AnalysisRecordsPublic:
    records = crud.get_analysis_records(
        session=session, user_id=current_user.id, skip=skip, limit=limit
    )
    return AnalysisRecordsPublic(
        data=[record for record in records],
        count=len(records),
    )


@router.get("/{record_id}", response_model=AnalysisRecordPublic)
def get_analysis_record(
    *, session: SessionDep, current_user: CurrentUser, record_id: uuid.UUID
) -> AnalysisRecord:
    record = crud.get_analysis_record(session=session, record_id=record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found")
    if record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this record")
    return record


@router.delete("/{record_id}", response_model=Message)
def delete_analysis_record(
    *, session: SessionDep, current_user: CurrentUser, record_id: uuid.UUID
) -> Message:
    record = crud.get_analysis_record(session=session, record_id=record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found")
    if record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this record")
    crud.delete_analysis_record(session=session, record_id=record_id)
    return Message(message="Analysis record deleted successfully")


@router.post("/{record_id}/files/", response_model=File)
async def upload_file(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    record_id: uuid.UUID,
    file: UploadFile,
) -> File:
    record = crud.get_analysis_record(session=session, record_id=record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found")
    if record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    file_id = uuid.uuid4()
    file_extension = Path(file.filename).suffix if file.filename else ""
    safe_filename = f"{file_id}{file_extension}"
    file_path = UPLOAD_DIR / safe_filename

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    file_in = FileCreate(
        record_id=record_id,
        file_name=file.filename or "unknown",
        file_type=file.content_type,
    )
    return crud.create_file(
        session=session, file_in=file_in, file_path=str(file_path), file_size=len(contents)
    )


@router.get("/{record_id}/files/", response_model=FilesPublic)
def get_record_files(
    *, session: SessionDep, current_user: CurrentUser, record_id: uuid.UUID
) -> FilesPublic:
    record = crud.get_analysis_record(session=session, record_id=record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found")
    if record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    files = crud.get_files_by_record(session=session, record_id=record_id)
    return FilesPublic(data=list(files), count=len(files))


@router.delete("/{record_id}/files/{file_id}", response_model=Message)
def delete_file(
    *, session: SessionDep, current_user: CurrentUser, record_id: uuid.UUID, file_id: uuid.UUID
) -> Message:
    record = crud.get_analysis_record(session=session, record_id=record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found")
    if record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    file = session.get(File, file_id)
    if not file or file.record_id != record_id:
        raise HTTPException(status_code=404, detail="File not found")

    if os.path.exists(file.file_path):
        os.remove(file.file_path)

    crud.delete_file(session=session, file_id=file_id)
    return Message(message="File deleted successfully")


@router.get("/files/{file_id}/download")
def download_file(
    *, session: SessionDep, current_user: CurrentUser, file_id: uuid.UUID
) -> FileResponse:
    file = session.get(File, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    record = crud.get_analysis_record(session=session, record_id=file.record_id)
    if record and record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not os.path.exists(file.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    return FileResponse(
        path=file.file_path,
        filename=file.file_name,
        media_type=file.file_type or "application/octet-stream",
    )
