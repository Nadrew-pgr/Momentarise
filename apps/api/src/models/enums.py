import enum


class WorkspaceRole(str, enum.Enum):
    ADMIN = "ADMIN"
    USER = "USER"
