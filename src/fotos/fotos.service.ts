import { Injectable, NotFoundException } from '@nestjs/common';
import type { Foto } from './entities/foto.entity.js';

@Injectable()
export class FotosService {
    private siguienteId = 4;
    private fotos: Foto[] = [
        { id: 1, titulo: 'Malecon', calificacion: 5 },
        { id: 2, titulo: 'Atardecer', calificacion: 4 },
        { id: 3, titulo: 'JR', calificacion: 3 }
    ];

findAll(): Foto[] {
    return this.fotos;
}

findOne(id: number): Foto {
    const foto = this.fotos.find((f) => f.id === id);
    if (!foto) {
        throw new NotFoundException(`Foto ${id} no encontrada`);
    }
    return foto;
}

create(datos: Omit<Foto, 'id'>): Foto {
    const nueva = { ...datos, id: this.siguienteId++ };
    this.fotos.push(nueva);
    return nueva;
}

update(id: number, datos: Partial<Omit<Foto, 'id'>>): Foto {
    const foto = this.findOne(id);
    Object.assign(foto, datos, { id });
    return foto;
}

remove(id: number): void {
    const foto = this.findOne(id);
    this.fotos = this.fotos.filter((f) => f !== foto);
}
}
