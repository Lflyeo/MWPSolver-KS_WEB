from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=64, description="用户名")
    password: str = Field(..., min_length=6, max_length=64, description="密码")


class LoginRequest(BaseModel):
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class UserInfo(BaseModel):
    id: str
    username: str
    nickname: str | None = None
    avatar_url: str | None = None


class ProfileUpdateRequest(BaseModel):
    nickname: str | None = Field(None, max_length=64, description="昵称")
    avatar_url: str | None = Field(None, max_length=512, description="头像URL")


class LoginResponse(BaseModel):
    errCode: int = 0
    errMsg: str = "success"
    data: dict = Field(default_factory=dict)  # { "access_token": str, "token_type": "bearer", "user": UserInfo }
