-- AlterTable
ALTER TABLE "Product" ADD COLUMN "description" TEXT,
ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "imageData" BYTEA,
ADD COLUMN "imageType" TEXT;

-- Backfill the existing six products (order + the description the site already shows); never overwrites an existing description
UPDATE "Product" SET "description" = 'Fresh strawberry, rosy milk and a berry scoop. Bright, juicy and cool.' WHERE "id" = 'strawberry' AND "description" IS NULL;
UPDATE "Product" SET "description" = 'Delicate rose syrup, chilled milk and silky vanilla ice cream, finished with fragrant petals.' WHERE "id" = 'rose' AND "description" IS NULL;
UPDATE "Product" SET "description" = 'Sun-ripened mango, saffron-warmed milk and a golden mango scoop.' WHERE "id" = 'mango' AND "description" IS NULL;
UPDATE "Product" SET "description" = 'Roasted pistachio cream layered with basil seeds, falooda sev and chilled milk.' WHERE "id" = 'pistachio' AND "description" IS NULL;
UPDATE "Product" SET "description" = 'Dark cocoa ribbons, creamy milk and a velvety chocolate scoop.' WHERE "id" = 'chocolate' AND "description" IS NULL;
UPDATE "Product" SET "description" = 'Almonds, cashews and pistachio in kesar-infused layers with a golden finish.' WHERE "id" = 'dryfruit' AND "description" IS NULL;
UPDATE "Product" SET "sortOrder" = 1 WHERE "id" = 'strawberry';
UPDATE "Product" SET "sortOrder" = 2 WHERE "id" = 'rose';
UPDATE "Product" SET "sortOrder" = 3 WHERE "id" = 'mango';
UPDATE "Product" SET "sortOrder" = 4 WHERE "id" = 'pistachio';
UPDATE "Product" SET "sortOrder" = 5 WHERE "id" = 'chocolate';
UPDATE "Product" SET "sortOrder" = 6 WHERE "id" = 'dryfruit';
