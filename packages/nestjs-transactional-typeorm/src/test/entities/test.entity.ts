import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('test')
export class TestEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  public idx!: number;

  @Column({ type: 'int', nullable: true })
  public test!: number | null;
}
