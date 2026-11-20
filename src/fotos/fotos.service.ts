import { Injectable, NotFoundException } from '@nestjs/common';
import { Foto } from './entities/foto.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class FotosService {
  constructor(
    @InjectRepository(Foto)
    private readonly fotosRepository: Repository<Foto>,
  ) {}

  findAll(): Promise<Foto[]> {
    return this.fotosRepository.find();
  }

  async findOne(id: number): Promise<Foto> {
    const foto = await this.fotosRepository.findOneBy({ id });
    if (!foto) throw new NotFoundException(`Foto ${id} no encontrada`);
    return foto;
  }

  create(datos: Partial<Foto>): Promise<Foto> {
    const nuevaFoto = this.fotosRepository.create(datos);
    return this.fotosRepository.save(nuevaFoto);
  }

  async update(id: number, datos: Partial<Omit<Foto, 'id'>>): Promise<Foto> {
    const foto = await this.findOne(id);
    Object.assign(foto, datos, { id });
    return this.fotosRepository.save(foto);
  }

  async remove(id: number): Promise<void> {
    const foto = await this.findOne(id);
    await this.fotosRepository.remove(foto);
  }
}
