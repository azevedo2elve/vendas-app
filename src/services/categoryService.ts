import { database } from '@/database';
import Category from '@/database/models/Category';

export async function isCategoryNameTaken(name: string, ignoreId?: string): Promise<boolean> {
  const categories = await database.get<Category>('categories').query().fetch();
  const normalized = name.trim().toLowerCase();
  return categories.some((category) => category.id !== ignoreId && category.name.trim().toLowerCase() === normalized);
}

export async function createCategory(name: string): Promise<Category> {
  let created!: Category;
  await database.write(async () => {
    created = await database.get<Category>('categories').create((record) => {
      record.name = name.trim();
    });
  });
  return created;
}
