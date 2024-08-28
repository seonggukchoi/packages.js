import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bar_test')
export class BarTestEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  public idx!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  public bar?: string;
}
