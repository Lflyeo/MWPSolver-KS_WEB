from sqlalchemy import Column, String, Text

from database import Base


class SystemSetting(Base):
    """系统配置表：用于存储可在后台调整的全局配置，如大模型接口地址与密钥。"""

    __tablename__ = "system_settings"

    key = Column(String(64), primary_key=True, nullable=False, comment="配置键，如 UNIAPI_BASE_URL")
    value = Column(Text, nullable=True, comment="配置值，文本格式")

