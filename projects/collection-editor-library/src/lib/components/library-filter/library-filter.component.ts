import { Component, OnInit, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import * as _ from 'lodash-es';
// import { data } from './data';
import {labelMessages} from '../labels';
import { libraryFilterConfig } from './library-filter-config';
import { FrameworkService } from '../../services';
import { Subject } from 'rxjs';
import { takeUntil, filter, take, map } from 'rxjs/operators';
import { EditorService } from '../../services';

@Component({
  selector: 'lib-library-filter',
  templateUrl: './library-filter.component.html',
  styleUrls: ['./library-filter.component.scss']
})
export class LibraryFilterComponent implements OnInit, OnChanges {
  @Input() sessionContext: any;
  @Input() collectionData: any;
  @Input() filterOpenStatus: boolean;
  @Output() filterChangeEvent: EventEmitter<any> = new EventEmitter();

  labelMessages = labelMessages;
  // filters = data.filters;
  filterConfig: any;
  filterFields = _.get(_.first(libraryFilterConfig), 'fields');
  // activeFilterData = data.activeFilterData;
  searchFilterForm: FormGroup;
  public isFilterShow = false;
  public telemetryPageId: string;
  public framework = 'ekstep_ncert_k-12';
  private onComponentDestroy$ = new Subject<any>();
  public frameworkDetails: any = {};
  public currentFilters: any;
  private editorConfig: any;
  private filterValues: any;
  constructor( private sbFormBuilder: FormBuilder, private frameworkService: FrameworkService,
    public editorService: EditorService) { }

  ngOnInit() {
    this.editorConfig = this.editorService.editorConfig.config;
    this.currentFilters = {
      'primaryCategory': _.get(this.editorConfig, 'hierarchy.level2.children.Content'),
      'board': [],
      'gradeLevel': [],
      'medium': [],
      'subject': [],
    }
    console.log(this.collectionData);
    this.fetchFrameWorkDetails();
  }

  ngOnChanges() {
    this.isFilterShow = this.filterOpenStatus;
  }

  initializeForm() {
  }

  fetchFrameWorkDetails() {
    this.frameworkService.frameworkData$.pipe(
      takeUntil(this.onComponentDestroy$),
      filter(data => _.get(data, `frameworkdata.${this.frameworkService.organisationFramework}`)),
      take(1)
    ).subscribe((frameworkDetails: any) => {
      if (frameworkDetails && !frameworkDetails.err) {
        const frameworkData = frameworkDetails.frameworkdata[this.frameworkService.organisationFramework].categories;
        this.frameworkDetails.frameworkData = frameworkData;
        this.frameworkDetails.topicList = _.get(_.find(frameworkData, {
          code: 'topic'
        }), 'terms');
        this.frameworkDetails.targetFrameworks = _.filter(frameworkDetails.frameworkdata, (value, key) => {
          return _.includes(this.frameworkService.targetFrameworkIds, key);
        });

        this.populateFilters();
      }
    });
  }

  /**
   * Get the association data for B M G S
   */
  getAssociationData(selectedData: Array<any>, category: string, frameworkCategories) {
    // Getting data for selected parent, eg: If board is selected it will get the medium data from board array
    let selectedCategoryData = [];
    _.forEach(selectedData, (data) => {
      const categoryData = _.filter(data.associations, (o) => {
        return o.category === category;
      });
      if (categoryData) {
        selectedCategoryData = _.concat(selectedCategoryData, categoryData);
      }
    });

    // Getting associated data from next category, eg: If board is selected it will get the association data for medium
    let associationData;
    _.forEach(frameworkCategories, (data) => {
      if (data.code === category) {
        associationData = data.terms;
      }
    });

    // Mapping the final data for next drop down
    let resultArray = [];
    _.forEach(selectedCategoryData, (data) => {
      const codeData = _.find(associationData, (element) => {
        return element.code === data.code;
      });
      if (codeData) {
        resultArray = _.concat(resultArray, codeData);
      }
    });

    return _.sortBy(_.unionBy(resultArray, 'identifier'), 'index');
  }

  populateFilters(){
    const categoryMasterList = this.frameworkDetails.frameworkData;
    _.forEach(categoryMasterList, (category) => {
      _.forEach(this.filterFields, (formFieldCategory) => {
        if (category.code === formFieldCategory.code) {
          formFieldCategory.terms = category.terms;
        }
      });
    });

    const index = this.filterFields.findIndex(e => _.get(e, 'code') === "primaryCategory");
    if (index !==  -1) {
      this.filterFields[index]['range'] = this.currentFilters['primaryCategory'];
      this.filterFields[index]['default'] = this.currentFilters['primaryCategory'];
    }

    libraryFilterConfig[0]['fields'] = _.cloneDeep(this.filterFields);
    this.filterConfig = libraryFilterConfig;
    debugger;
  }


  // should get applied association data from framework details
  getOnChangeAssociationValues(selectedFilter, caterory) {
    const mediumData = _.find(this.frameworkDetails.frameworkData, (element) => {
      return element.name === caterory;
    });
    let getAssociationsData = [];
    _.forEach(selectedFilter, (value) => {
      const getAssociationData = _.map(_.get(mediumData, 'terms'), (framework) => {
        if (framework['name'] === value) {
          return framework;
        }
      });
      getAssociationsData = _.compact(_.concat(getAssociationsData, getAssociationData));
    });
    return getAssociationsData;
  }

  showfilter() {
    this.isFilterShow = !this.isFilterShow;
    this.filterChangeEvent.emit({
      action: 'filterStatusChange',
      filterStatus: this.isFilterShow
    });
  }

  resetFilter() {
    this.searchFilterForm.reset();
    this.applyFilter();
  }

  applyFilter() {
    this.filterChangeEvent.emit({
      action: 'filterDataChange',
      filters: _.pickBy(this.filterValues)
    });
  }

  outputData($event) {
    console.log($event);
  }

  onStatusChanges($event) {
    console.log($event);
  }

  valueChanges($event) {
    this.filterValues = $event;
  }
}
