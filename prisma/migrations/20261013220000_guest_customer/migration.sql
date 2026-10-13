-- Lightweight (guest) customers: a name + mobile number with no login.
-- authUserId becomes optional (NULL = guest; the unique index still holds for real accounts), the phone is tracked as verified or not,
-- and phone stops being unique (a guest can type any number, so it must never be able to collide with, or take over, a real account). Existing rows are untouched.
ALTER TABLE "User" ALTER COLUMN "authUserId" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
DROP INDEX "User_phone_key";
CREATE INDEX "User_phone_idx" ON "User"("phone");
