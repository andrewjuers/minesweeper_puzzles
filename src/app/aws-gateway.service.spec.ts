import { TestBed } from '@angular/core/testing';

import { AwsGatewayService } from './aws-gateway.service';

describe('AwsGatewayService', () => {
  let service: AwsGatewayService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AwsGatewayService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
