/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const SHORTAGE_COLOR = "#3065D8";
let gIsFiltered = false;

var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
        this.receivedEvent('deviceready');
        
        reloadItems();
        document.getElementById("filter").addEventListener("click", clickedFilter);
        document.getElementById("reload").addEventListener("click", clickedReload);
    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
        console.log('Received Event: ' + id);
    }
};

function clickedFilter( e ) {
    let items = document.getElementById("items");
    let defective_num;
    
    if( gIsFiltered == false ) {
        // Set the filter
        
        for( target_item of items.children ) {
            defective_num = Number( target_item.getElementsByClassName("item_defective_num_val")[0].innerHTML );
            if( defective_num == 0 ) {
                target_item.style.display = "none";
            }
        }
        gIsFiltered = true;
    } else {
        // Remove the filter
        
        for( target_item of items.children ) {
            target_item.style.display = "flex";
        }
        gIsFiltered = false;
    }
}

function clickedReload( e ) {
    reloadItems();
}

function reloadItems() {
    let items = document.getElementById("items");
    let reloading_img = document.getElementById("reloading_img");
    
    // Clear items and display reloading image
    items.innerHTML = "";
    items.style.display = "none";
    reloading_img.style.display = "block";
    
    let request_url = `${REDMINE.url}/projects/${REDMINE.project_name}/issues.json?key=${REDMINE.api_key}&limit=100&sort=id`;
    
    $.ajax({
        url: request_url,
        type: "GET",
        dataType: 'json'
    }).done(function(data, status, xhr) {
        let template = document.getElementById("item_template").children[0];
        
        items.innerHTML = "";
        for(let issue of data.issues) {
            let item_id = issue.id;
            let item_name = issue.subject;
            let required_num;
            let stocked_num;
            for( cf of issue.custom_fields ) {
                if( cf.id == REDMINE.custom_field_id.required_num ) {
                    required_num = Number( cf.value );
                } else if( cf.id == REDMINE.custom_field_id.stocked_num ) {
                    stocked_num = Number( cf.value );
                }
            }
            let defective_num = calcDefectiveNum( required_num, stocked_num );
            
            let add_item = template.cloneNode(true);
            
            add_item.id = item_id;
            add_item.getElementsByClassName("item_name")[0].innerHTML = item_name;
            add_item.getElementsByClassName("item_required_num_val")[0].innerHTML = String( required_num );
            add_item.getElementsByClassName("item_stocked_num_val")[0].innerHTML = String( stocked_num );
            add_item.getElementsByClassName("item_defective_num_val")[0].innerHTML = String( defective_num );
            if( defective_num > 0 ) {
                add_item.getElementsByClassName("item_defective_num")[0].style.color = SHORTAGE_COLOR;
            }
            add_item.getElementsByClassName("item_dec")[0].addEventListener("click", { item_id: item_id, handleEvent: itemDecriment });
            add_item.getElementsByClassName("item_inc")[0].addEventListener("click", { item_id: item_id, handleEvent: itemIncriment });
            items.appendChild(add_item); 
        }

        reloading_img.style.display = "none";
        items.style.display = "block";
        document.getElementById("items").scrollTop = 0;
        
        gIsFiltered = false;
        
    }).fail(function(xhr, status, error) {
        console.log( {"xhr": xhr, "status": status, "error": error } );
        reloading_img.style.display = "none";
        errorOccurred( `ストック情報取得エラー(${xhr.status})` );
    });
}

function itemDecriment( e ) {
    changeItemNum( this.item_id, function( val ) { return ( val - 1 ); } );
}

function itemIncriment( e ) {
    changeItemNum( this.item_id, function( val ) { return ( val + 1 ); } );
}

function changeItemNum( item_id, calculator ) {
    let elem_item = document.getElementById( item_id );
    
    let elem_required_num = elem_item.getElementsByClassName("item_required_num_val")[0];
    let elem_stocked_num = elem_item.getElementsByClassName("item_stocked_num_val")[0];
    let elem_defective = elem_item.getElementsByClassName("item_defective_num")[0];
    let elem_defective_num = elem_item.getElementsByClassName("item_defective_num_val")[0];
    
    let required_num = Number( elem_required_num.innerHTML );
    let stocked_num = calculator( Number( elem_stocked_num.innerHTML ) );
    let defective_num = calcDefectiveNum( required_num, stocked_num );
    
    if( 0 <= stocked_num ) {
        // Update server
        updateTicketStockNum( item_id, stocked_num );

        // Update display
        elem_required_num.innerHTML = required_num;
        elem_stocked_num.innerHTML = stocked_num;
        elem_defective_num.innerHTML = defective_num;
        
        if( defective_num == 0 ) {
            elem_defective.style.color = "#000000";
            
            if( gIsFiltered == true ) {
                elem_item.style.display = "none";
            }
        } else {
            elem_defective.style.color = SHORTAGE_COLOR;
        }
    }
}

function updateTicketStockNum( ticket_id, new_stock_num ) {
    let request_url = `${REDMINE.url}/issues/${ticket_id}.json?key=${REDMINE.api_key}`;
    
    update_data = {
        "issue": {
            "custom_fields": [
                {
                    "id": REDMINE.custom_field_id.stocked_num,
                    "value": String( new_stock_num )
                }
            ]
        }
    };
    
    $.ajax({
        url: request_url,
        type: "PUT",
        contentType: 'application/json',
        data: JSON.stringify(update_data),
        dataType: 'text'
    }).done(function(data, status, xhr) {
        // Do nothing
    }).fail(function(xhr, status, error) {
        console.log( {"xhr": xhr, "status": status, "error": error } );
        errorOccurred( `ストック情報更新エラー(${xhr.status})` );
    });
}

function calcDefectiveNum( required_num, stocked_num ) {
    let defective_num = required_num - stocked_num;
    if( defective_num < 0 ) {
        defective_num = 0;
    }
    
    return defective_num;
}

function errorOccurred( message ) {
    alert( message );
    document.getElementById("items").innerHTML = "";
}

app.initialize();
