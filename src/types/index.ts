export type { Database, Tables, InsertDto, UpdateDto, Json } from "./database";

import type { Tables, InsertDto, UpdateDto } from "./database";

export type UserProfile = Tables<"user_profiles">;
export type UserProfileInsert = InsertDto<"user_profiles">;
export type UserProfileUpdate = UpdateDto<"user_profiles">;

export type Camera = Tables<"cameras">;
export type CameraInsert = InsertDto<"cameras">;
export type CameraUpdate = UpdateDto<"cameras">;

export type CameraAccess = Tables<"camera_access">;
export type CameraAccessInsert = InsertDto<"camera_access">;

export type UserRole = "super_admin" | "parent";