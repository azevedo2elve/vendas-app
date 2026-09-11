import { Directory, File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

// Fotos de produto ficam só no armazenamento do celular (nunca no banco/backup em base64, nunca
// no PDF) — reduzidas para no máximo 640px de largura e comprimidas em JPEG ~60% pra não pesar
// a lista de produtos nem o armazenamento do cliente.
const MAX_WIDTH = 640;
const JPEG_QUALITY = 0.6;

function photosDirectory(): Directory {
  const directory = new Directory(Paths.document, 'product-photos');
  directory.create({ intermediates: true, idempotent: true });
  return directory;
}

async function compressAndSave(sourceUri: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(sourceUri, [{ resize: { width: MAX_WIDTH } }], {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const destination = new File(photosDirectory(), `${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`);
  await new File(manipulated.uri).move(destination);
  return destination.uri;
}

export async function deleteProductPhoto(photoPath?: string | null): Promise<void> {
  if (!photoPath) return;
  const file = new File(photoPath);
  if (file.exists) {
    file.delete();
  }
}

type PickSource = 'camera' | 'library';

export async function pickProductPhoto(source: PickSource): Promise<string | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error(
      source === 'camera'
        ? 'Permissão de câmera negada. Ative o acesso à câmera nas configurações do celular.'
        : 'Permissão de galeria negada. Ative o acesso às fotos nas configurações do celular.'
    );
  }

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return compressAndSave(result.assets[0].uri);
}

export async function replaceProductPhoto(source: PickSource, previousPath?: string | null): Promise<string | null> {
  const newPath = await pickProductPhoto(source);
  if (!newPath) return null;
  await deleteProductPhoto(previousPath);
  return newPath;
}
