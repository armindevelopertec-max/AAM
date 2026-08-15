import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {

  private products = [
    {
      id: 1,
      name: 'Laptop',
      price: 5000,
    },
    {
      id: 2,
      name: 'Mouse',
      price: 100,
    },
  ]

  create(createProductDto: CreateProductDto) {
    const newProduct = {
      id: this.products.length + 1,
      ...createProductDto,
    };

    this.products.push(newProduct);

    return newProduct;
  }

  findAll() {
    return this.products;
  }

  findOne(id: number) {
    return this.products.find(product => product.id === id);
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    const product = this.products.find(product => product.id === id);
    if (!product) {
      return null;
    }
    Object.assign(product, updateProductDto);
    return product;
  }

  remove(id: number) {
    const index = this.products.findIndex(product => product.id ===id);
    if (index === -1) {
      return null;
    }
    const deletedProduct = this.products.splice(index, 1);
    return deletedProduct[0];
  }
}
