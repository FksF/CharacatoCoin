import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Staking } from './staking';

describe('Staking', () => {
  let component: Staking;
  let fixture: ComponentFixture<Staking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Staking]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Staking);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
