import { Injectable } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  private clients = [
    {
      id: 1,
      name: 'Ana García',
      email: 'ana.garcia@example.com',
      phone: '555-0101',
    },
    {
      id: 2,
      name: 'Luis Pérez',
      email: 'luis.perez@example.com',
      phone: '555-0102',
    },
  ];

  create(createClientDto: CreateClientDto) {
    const newClient = {
      id: this.clients.length + 1,
      ...createClientDto,
    };

    this.clients.push(newClient);

    return newClient;
  }

  findAll() {
    return this.clients;
  }

  findOne(id: number) {
    return this.clients.find((client) => client.id === id);
  }

  update(id: number, updateClientDto: UpdateClientDto) {
    const client = this.clients.find((client) => client.id === id);
    if (!client) {
      return null;
    }
    Object.assign(client, updateClientDto);
    return client;
  }

  remove(id: number) {
    const index = this.clients.findIndex((client) => client.id === id);
    if (index === -1) {
      return null;
    }
    const deletedClient = this.clients.splice(index, 1);
    return deletedClient[0];
  }
}
