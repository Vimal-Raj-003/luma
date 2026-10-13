-- Mobile OTP login: customers can sign up with only a mobile number.
-- email stops being mandatory (it stays unique when present); phone becomes unique. Existing rows are untouched.
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
