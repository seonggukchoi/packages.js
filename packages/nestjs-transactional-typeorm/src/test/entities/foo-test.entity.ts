import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('foo_test')
export class FooTestEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  public idx!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  public foo?: string;
}
