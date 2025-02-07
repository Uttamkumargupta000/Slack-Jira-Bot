import { Test, TestingModule } from '@nestjs/testing';
import { JiraController } from './jira.controller';
import { JiraService } from './jira.service';

describe('JiraController', () => {
  let controller: JiraController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JiraController],
      providers: [JiraService],
    }).compile();

    controller = module.get<JiraController>(JiraController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
