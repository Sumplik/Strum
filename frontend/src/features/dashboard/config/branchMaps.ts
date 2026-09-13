import DenahUp2w1 from "@/assets/images/denah UP2W 1.svg";
import DenahUp2w2 from "@/assets/images/denah UP2W 2.svg";
import DenahUp2w3 from "@/assets/images/denah UP2W 3.svg";
import DenahUp2w4 from "@/assets/images/denah UP2W 4.svg";
import DenahUp2w5 from "@/assets/images/denah UP2W 5.svg";
import DenahUp2w6 from "@/assets/images/denah UP2W 6.svg";
import { WORKSHOP_ROOM_GRID, type RoomGridConfig } from "./mapRoomGrid";

export type BranchMapConfig = {
  // URL gambar denah (import dari src/assets/images).
  denah: string;
  // Posisi slot per ruangan; urutan kunci = prioritas pencocokan teks lokasi mesin.
  rooms: Record<string, RoomGridConfig>;
};

// Denah per kantor cabang: gambar `src/assets/images/denah UP2W <n>.svg` + posisi ruangannya.
// Saat ini semua cabang memakai gambar denah workshop yang sama, sehingga posisi ruangannya pun sama;
// ganti `rooms` cabang tertentu bila gambarnya berbeda. Cabang yang tidak ada di sini ditampilkan
// tanpa denah (daftar mesin tetap muncul).
export const BRANCH_MAPS: Partial<Record<string, BranchMapConfig>> = {
  UP2W1: { denah: DenahUp2w1, rooms: WORKSHOP_ROOM_GRID },
  UP2W2: { denah: DenahUp2w2, rooms: WORKSHOP_ROOM_GRID },
  UP2W3: { denah: DenahUp2w3, rooms: WORKSHOP_ROOM_GRID },
  UP2W4: { denah: DenahUp2w4, rooms: WORKSHOP_ROOM_GRID },
  UP2W5: { denah: DenahUp2w5, rooms: WORKSHOP_ROOM_GRID },
  UP2W6: { denah: DenahUp2w6, rooms: WORKSHOP_ROOM_GRID },
};
