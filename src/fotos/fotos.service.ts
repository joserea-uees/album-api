import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Foto } from './entities/foto.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, Repository } from 'typeorm';

export interface FiltroFotos {
  min?: number;
  max?: number;
  q?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class FotosService {
  constructor(
    @InjectRepository(Foto)
    private readonly fotosRepository: Repository<Foto>,
  ) {}

  async findAll({
    min = 0,
    max = 5,
    q,
    page = 1,
    limit = 10,
  }: FiltroFotos = {}): Promise<{
    data: Foto[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      throw new BadRequestException('El rango min/max no es válido');
    }
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      !Number.isSafeInteger((page - 1) * limit)
    ) {
      throw new BadRequestException(
        'page y limit deben ser enteros positivos válidos',
      );
    }
    if (q !== undefined && typeof q !== 'string') {
      throw new BadRequestException('q debe ser un texto');
    }
    const [data, total] = await this.fotosRepository.findAndCount({
      where: {
        calificacion: Between(min, max),
        ...(q ? { titulo: ILike(`%${q}%`) } : {}),
      },
      relations: { etiquetas: true },
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Foto> {
    const foto = await this.fotosRepository.findOne({
      where: { id },
      relations: { album: true, etiquetas: true },
    });
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
