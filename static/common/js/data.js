// 地圖網址: https://data.gov.tw/dataset/7441、https://data.gov.tw/dataset/7442
// 地圖轉換: https://mapshaper.org/
/* 步驟: 
  *  1.[地圖網址] 按SHP下載
  *  2.[轉換網址] 上傳壓縮檔
  *    2-1.Simplify 簡化線圖
  *    2-2.Export GeoJSON
  **/

// ajax 數個必要資料，callback 回傳整理過的 data
function getMainData( mapType, callback ){
  $.get( '/static/common/json/TOWN2.json', ( townData )=>{
    $.get( '/static/common/json/COUNTY2.json', ( countyData )=>{
      $.get( '/static/common/json/mp2.json', ( surveyData )=>{
        let svB = {
          "國民黨籍議員好感度比例Max": 0,
          "國民黨籍議員好感度比例Min": 100,
          "民進黨籍議員好感度比例Max": 0,
          "民進黨籍議員好感度比例Min": 100,
          "市長施政滿意比例Max": 0,
          "市長施政滿意比例Min": 100,
          "市長施政不滿意比例Max": 0,
          "市長施政不滿意比例Min": 100,
        }
        // 將數據%轉為純數字 & #N/A改為""
        surveyData = surveyData.map( (obj) => {
          $.each( obj, (key, val) => {
            if ( val === '#N/A' ){
              obj[key] = ''
            } else if ( key.indexOf('好感度') > -1 || key.indexOf('比例') > -1 ){
              obj[key] = val.indexOf('%') > -1 ? +val.replace('%','') : 0
            } else {
              obj[key] = val
            }
          })

          if ( obj['國民黨籍議員好感度比例'] > obj['民進黨籍議員好感度比例'] ){
            svB['國民黨籍議員好感度比例Max'] = Math.max( svB['國民黨籍議員好感度比例Max'], obj['國民黨籍議員好感度比例'] )
            svB['國民黨籍議員好感度比例Min'] = Math.min( svB['國民黨籍議員好感度比例Min'], obj['國民黨籍議員好感度比例'] )
          } else if ( obj['國民黨籍議員好感度比例'] <= obj['民進黨籍議員好感度比例'] ) {
            svB['民進黨籍議員好感度比例Max'] = Math.max( svB['民進黨籍議員好感度比例Max'], obj['民進黨籍議員好感度比例'] )
            svB['民進黨籍議員好感度比例Min'] = Math.min( svB['民進黨籍議員好感度比例Min'], obj['民進黨籍議員好感度比例'] )
          }

          svB['市長施政滿意比例Max'] = Math.max( svB['市長施政滿意比例Max'], obj['市長施政滿意比例'] )
          svB['市長施政滿意比例Min'] = Math.min( svB['市長施政滿意比例Min'], obj['市長施政滿意比例'] )
          svB['市長施政不滿意比例Max'] = Math.max( svB['市長施政不滿意比例Max'], obj['市長施政不滿意比例'] )
          svB['市長施政不滿意比例Min'] = Math.min( svB['市長施政不滿意比例Min'], obj['市長施政不滿意比例'] )

          // if ( obj['市長施政滿意比例'] > obj['市長施政不滿意比例'] ){
          //   svB['市長施政滿意比例Max'] = Math.max( svB['市長施政滿意比例Max'], (obj['市長施政滿意比例'] - obj['市長施政不滿意比例']).toFixed(2) )
          // } else if ( obj['市長施政滿意比例'] <= obj['市長施政不滿意比例'] ) {
          //   svB['市長施政滿意比例Min'] = Math.min( svB['市長施政滿意比例Min'], (obj['市長施政滿意比例'] - obj['市長施政不滿意比例']).toFixed(2) )
          // }

          return obj
        })

        // // 鄉鎮 塞入數據
        // townData.features.forEach( (obj) => {
        //   surveyData.find( (svObj) => {
        //     if ( svObj.COUNTYID === obj.properties.COUNTYID && svObj.TOWNID === obj.properties.TOWNID ){
        //       obj['sv'] = svObj
        //       return true
        //     }
        //     return false
        //   })
        // })
        // // 縣市 塞入數據
        // countyData.features.forEach( (obj) => {
        //   surveyData.find( (svObj) => {
        //     if ( svObj.COUNTYID === obj.properties.COUNTYID && ( svObj.TOWNID === '' || svObj.TOWNID === undefined ) ){
        //       obj['sv'] = svObj
        //       return true
        //     }
        //     return false
        //   })
        // })

        let allData = JSON.parse(JSON.stringify(townData))
        allData['mapSize'] = mapType === 'town' ? 'town' : 'county'
        allData['svBoundary'] = svB
        allData.features = mapType === 'town' ? [...townData.features, ...countyData.features] : [...countyData.features]

        allData.features.forEach( (mapObj) => {
          surveyData.find( (svObj) => {
            if (svObj.COUNTYID === mapObj.properties.COUNTYID){
              if (
                (mapObj.properties.TOWNID && svObj.TOWNID && mapObj.properties.TOWNID === svObj.TOWNID) ||
                (!mapObj.properties.TOWNID && ( svObj.TOWNID === '' || svObj.TOWNID === undefined)) 
                ){ 
                mapObj['sv'] = svObj
                return true
              }
            }
            return false
          })
        })

        function getGeo_DeleteOutOfBoundary( geo, boundary ){
          let {left=-180, right=180, top=90, bottom=-90} = boundary
          
          let coord = geo.coordinates
          if ( geo.type === 'MultiPolygon' ){
            $.each( coord, (cIdx, cItem) => {
              $.each( cItem, (iIdx, iItem) => {
                cItem[iIdx] = iItem.filter( (item, idx) => {
                  return (
                    item[0] > left &&
                    item[0] < right &&
                    item[1] < top &&
                    item[1] > bottom
                  )
                })
              })
            })
            // 過濾空陣列
            $.each( coord, (cIdx, cItem) => { 
              coord[cIdx] = cItem.filter( (item, idx) => {
                return item[0]
              })
            })
          } 
          else if ( geo.type === 'Polygon' ) {
            $.each( coord, (cIdx, cItem) => {
              coord[cIdx] = cItem.filter( (item, idx) => {
                return (
                  item[0] > left &&
                  item[0] < right &&
                  item[1] < top &&
                  item[1] > bottom
                )
              })
            })
          }

          return geo
        }
        
        /**
         * @param {object} data 給整個json資料 或 資料裡特定的 geometry
         * @param {function} callback(item,data) item: 處理這層座標 [[122,23][122,24]...] , data: 回傳原先傳入的data
         **/
        function data_polygon_edit( data, callback ){
          /*  data: {
                features: [
                  {
                    geometry: {
                      type: "Polygon", coordinates: [[[0,0][1,1]]], // 共3層，item為下一層: [[0,0][1,1]]
                    }
                  },
                  {
                    geometry: {
                      type: "MultiPolygon", coordinates: [[[[0,0][1,1]]]], // 共4層，item為下二層: [[0,0][1,1]]
                    }
                  }
                ]
              } */
          if ( data.features ){ // 給整個json
            $.each( data.features, (idx, obj) => {
              forGeoCoord(obj.geometry)
            })
          } else if ( data.coordinates ){ // 給指定geo
            forGeoCoord(data)
          }

          function forGeoCoord(geo){
            if ( geo.type === 'MultiPolygon' ){
              $.each( geo.coordinates, (cIdx, cItem) => {
                $.each( cItem, (iIdx, item) => {
                  callback( item, data )
                })
              })
            } else if ( geo.type === 'Polygon' ) {
              $.each( geo.coordinates, (cIdx, cItem) => {
                callback( cItem, data )
              })
            }
          }
          
          return data
        }

        // 處理地圖 - 經緯度偏移 & 離島刪除
        $.each( allData.features, (idx, obj) => {
          let prop = obj.properties
          let geo = obj.geometry
          let coord = obj.geometry.coordinates
          
          switch( prop.COUNTYID ){
            case 'E': // 高雄市
              // 刪除離島
              var boundary = { left: 120.0, bottom: 22.2 }

              // COUNTY & TOWN (旗津區)
              if ( prop.TOWNID === undefined || prop.TOWNID === 'E10' ){
                geo = getGeo_DeleteOutOfBoundary(geo, boundary)
              }
            break;

            case 'C': // 基隆市
              // 刪除離島
              var boundary = { right: 121.9, top: 25.2 }

              // COUNTY & TOWN (中正區)
              if ( prop.TOWNID === undefined || prop.TOWNID === 'C01' ){
                geo = getGeo_DeleteOutOfBoundary(geo, boundary)
              }
            break;

            case 'G': // 宜蘭縣
              // 刪除離島
              var boundary = { right: 122.1, top: 25.1 }

              // COUNTY & TOWN (頭城鎮)
              if ( prop.TOWNID === undefined || prop.TOWNID === 'G02' ){
                geo = getGeo_DeleteOutOfBoundary(geo, boundary)
              }
            break;

            case 'Z': // 連江縣
              // 偏移 (連江縣)
              var loc_W = [0.3, -0.7]
              geo = data_polygon_edit( geo, (item)=>{
                $.each( item, (idx,val)=>{
                  val[0] += loc_W[0]
                  val[1] += loc_W[1]
                })
              })
            break;

            case 'W': // 金門縣
              // 偏移 (金門縣)
              var loc_W = [1.1, 0]
              geo = data_polygon_edit( geo, (item)=>{
                $.each( item, (idx,val)=>{
                  val[0] += loc_W[0]
                  val[1] += loc_W[1]
                })
              })

              // 偏移 (烏坵鄉)
              var loc_W06 = [-0.65, -0.35]

              // COUNTY
              if ( prop.TOWNID === undefined ){
                if ( geo.type === 'MultiPolygon' ){
                  $.each( coord, (cIdx, cItem) => {
                    if ( cIdx == coord.length-1 || cIdx == coord.length-2 ){
                      $.each( cItem, (idx2, ele2) => {
                        $.each( ele2, (idx3, ele3) => {
                          ele3[0] += loc_W06[0]
                          ele3[1] += loc_W06[1]
                        })
                      })
                    }
                  })
                } else if ( geo.type === 'Polygon' ) {
                  $.each( coord, (cIdx, cItem) => {
                    if ( cIdx == coord.length-1 || cIdx == coord.length-2 ){
                      $.each( cItem, (idx2, ele2) => {
                        ele2[0] += loc_W06[0]
                        ele2[1] += loc_W06[1]
                      })
                    }
                  })
                }
              }

              // TOwN (烏坵鄉)
              if ( prop.TOWNID === 'W06' ){
                geo = data_polygon_edit( geo, (item)=>{
                  $.each( item, (idx, ele)=>{
                    ele[0] += loc_W06[0]
                    ele[1] += loc_W06[1]
                  })
                })
              }
              break;
          }
        })

        allData.mapBoundary = { maxX: -90, maxY: -90, minX: 180, minY: 180 }
        let outputDATA = data_polygon_edit( allData, (item, da)=>{ 
          // 算出最大經緯度
          $.each( item, (idx, ele)=>{
            da.mapBoundary.maxX = Math.max( da.mapBoundary.maxX, ele[0] )
            da.mapBoundary.maxY = Math.max( da.mapBoundary.maxY, ele[1] )
            da.mapBoundary.minX = Math.min( da.mapBoundary.minX, ele[0] )
            da.mapBoundary.minY = Math.min( da.mapBoundary.minY, ele[1] )
          })

          // 額外處理json檔，因為原始檔案陣列是反轉的，所以將它校正。
          item.reverse() 
        })

        callback( outputDATA )
      })
    })
  })
}


function ajaxMapData( mapType, callback ){
  return new Promise( resolve => {
    $.get( '/static/common/json/TOWN2.json', townData => {
      $.get( '/static/common/json/COUNTY2.json', countyData => {
        let allData = JSON.parse(JSON.stringify(countyData))
        allData.features = mapType === 'town' ? [...townData.features, ...countyData.features] : [...countyData.features]

        function getGeo_DeleteOutOfBoundary( geo, boundary ){
          let {left=-180, right=180, top=90, bottom=-90} = boundary
          
          let coord = geo.coordinates
          if ( geo.type === 'MultiPolygon' ){
            $.each( coord, (cIdx, cItem) => {
              $.each( cItem, (iIdx, iItem) => {
                cItem[iIdx] = iItem.filter( (item, idx) => {
                  return (
                    item[0] > left &&
                    item[0] < right &&
                    item[1] < top &&
                    item[1] > bottom
                  )
                })
              })
            })
            // 過濾空陣列
            $.each( coord, (cIdx, cItem) => { 
              coord[cIdx] = cItem.filter( (item, idx) => {
                return item[0]
              })
            })
          } 
          else if ( geo.type === 'Polygon' ) {
            $.each( coord, (cIdx, cItem) => {
              coord[cIdx] = cItem.filter( (item, idx) => {
                return (
                  item[0] > left &&
                  item[0] < right &&
                  item[1] < top &&
                  item[1] > bottom
                )
              })
            })
          }

          return geo
        }
        
        /**
        * @param {object} data 給整個json資料 或 資料裡特定的 geometry
        * @param {function} callback(item,data) item: 處理這層座標 [[122,23][122,24]...] , data: 回傳原先傳入的data
        **/
        function data_polygon_edit( data, callback ){
          /*  data: {
                features: [
                  {
                    geometry: {
                      type: "Polygon", coordinates: [[[0,0][1,1]]], // 共3層，item為下一層: [[0,0][1,1]]
                    }
                  },
                  {
                    geometry: {
                      type: "MultiPolygon", coordinates: [[[[0,0][1,1]]]], // 共4層，item為下二層: [[0,0][1,1]]
                    }
                  }
                ]
              } */
          if ( data.features ){ // 給整個json
            $.each( data.features, (idx, obj) => {
              forGeoCoord(obj.geometry)
            })
          } else if ( data.coordinates ){ // 給指定geo
            forGeoCoord(data)
          }

          function forGeoCoord(geo){
            if ( geo.type === 'MultiPolygon' ){
              $.each( geo.coordinates, (cIdx, cItem) => {
                $.each( cItem, (iIdx, item) => {
                  callback( item, data )
                })
              })
            } else if ( geo.type === 'Polygon' ) {
              $.each( geo.coordinates, (cIdx, cItem) => {
                callback( cItem, data )
              })
            }
          }
          
          return data
        }

        // 處理地圖 - 經緯度偏移 & 離島刪除
        $.each( allData.features, (idx, obj) => {
          let prop = obj.properties
          let geo = obj.geometry
          let coord = obj.geometry.coordinates
          
          switch( prop.COUNTYID ){
            case 'E': // 高雄市
              // 刪除離島
              var boundary = { left: 120.0, bottom: 22.2 }

              // COUNTY & TOWN (旗津區)
              if ( prop.TOWNID === undefined || prop.TOWNID === 'E10' ){
                geo = getGeo_DeleteOutOfBoundary(geo, boundary)
              }
            break;

            case 'C': // 基隆市
              // 刪除離島
              var boundary = { right: 121.9, top: 25.2 }

              // COUNTY & TOWN (中正區)
              if ( prop.TOWNID === undefined || prop.TOWNID === 'C01' ){
                geo = getGeo_DeleteOutOfBoundary(geo, boundary)
              }
            break;

            case 'G': // 宜蘭縣
              // 刪除離島
              var boundary = { right: 122.1, top: 25.1 }

              // COUNTY & TOWN (頭城鎮)
              if ( prop.TOWNID === undefined || prop.TOWNID === 'G02' ){
                geo = getGeo_DeleteOutOfBoundary(geo, boundary)
              }
            break;

            case 'Z': // 連江縣
              // 偏移 (連江縣)
              var loc_W = [0.3, -0.7]
              geo = data_polygon_edit( geo, (item)=>{
                $.each( item, (idx,val)=>{
                  val[0] += loc_W[0]
                  val[1] += loc_W[1]
                })
              })
            break;

            case 'W': // 金門縣
              // 偏移 (金門縣)
              var loc_W = [1.1, 0]
              geo = data_polygon_edit( geo, (item)=>{
                $.each( item, (idx,val)=>{
                  val[0] += loc_W[0]
                  val[1] += loc_W[1]
                })
              })

              // 偏移 (烏坵鄉)
              var loc_W06 = [-0.65, -0.35]

              // COUNTY
              if ( prop.TOWNID === undefined ){
                if ( geo.type === 'MultiPolygon' ){
                  $.each( coord, (cIdx, cItem) => {
                    if ( cIdx == coord.length-1 || cIdx == coord.length-2 ){
                      $.each( cItem, (idx2, ele2) => {
                        $.each( ele2, (idx3, ele3) => {
                          ele3[0] += loc_W06[0]
                          ele3[1] += loc_W06[1]
                        })
                      })
                    }
                  })
                } else if ( geo.type === 'Polygon' ) {
                  $.each( coord, (cIdx, cItem) => {
                    if ( cIdx == coord.length-1 || cIdx == coord.length-2 ){
                      $.each( cItem, (idx2, ele2) => {
                        ele2[0] += loc_W06[0]
                        ele2[1] += loc_W06[1]
                      })
                    }
                  })
                }
              }

              // TOwN (烏坵鄉)
              if ( prop.TOWNID === 'W06' ){
                geo = data_polygon_edit( geo, (item)=>{
                  $.each( item, (idx, ele)=>{
                    ele[0] += loc_W06[0]
                    ele[1] += loc_W06[1]
                  })
                })
              }
              break;
          }
        })

        allData.mapBoundary = { maxX: -90, maxY: -90, minX: 180, minY: 180 }
        let resData = data_polygon_edit( allData, (item, da)=>{ 
          // 算出最大經緯度
          $.each( item, (idx, ele)=>{
            da.mapBoundary.maxX = Math.max( da.mapBoundary.maxX, ele[0] )
            da.mapBoundary.maxY = Math.max( da.mapBoundary.maxY, ele[1] )
            da.mapBoundary.minX = Math.min( da.mapBoundary.minX, ele[0] )
            da.mapBoundary.minY = Math.min( da.mapBoundary.minY, ele[1] )
          })

          // 額外處理json檔，因為原始檔案陣列是反轉的，所以將它校正。
          item.reverse() 
        })

        if ( callback ){
          resData = callback( resData )
        }

        resolve( resData )
      })
    })
  })
}

function ajaxSurveyData( url, callback ){
  return new Promise( resolve => {
    $.get( url, resData => {
      if ( callback ){
        resData = callback( resData )
      }
      resolve( resData )
    })
  })
}

function getAllData( FN_ajaxMapData, FN_ajaxSurveyData, callback ){
  Promise.all([FN_ajaxMapData, FN_ajaxSurveyData]).then( values => {
    let mapData = values[0]
    let surveyData = values[1]

    surveyData.forEach( (svObj) => {
      mapData.features.find( (mapObj) => {
        if (svObj.COUNTYID === mapObj.properties.COUNTYID){
          if (
            (mapObj.properties.TOWNID && svObj.TOWNID && mapObj.properties.TOWNID === svObj.TOWNID) ||
            (!mapObj.properties.TOWNID && ( svObj.TOWNID === '' || svObj.TOWNID === undefined)) 
            ){ 
            mapObj['sv'] = svObj
            return true
          }
        }
        return false
      })
    })

    if ( callback ){
      mapData = callback( mapData )
    }

    return mapData
  })
}
