$(document).ready(function(){
    // User Search Code Start
    $("#search").on('click', function(){
      search("datasearch");
    });

    $("#searchdata").on('keyup',function(e){
          if(e.keyCode == 13){
            search("datasearch");
          }
    });

    $(document).on('click',"#reset",function(){
      $("#searchdata").val("");
      search("all");
    });
    // User Search Code End
    
    // User Edit Code Start
    $(document).on('click','#useredit', function(){
      const index = $("tr #useredit").index(this);
      const dataid = $(this).data("id");
      $(this).parents('tr').find('td.editableColumns').each(function(serialno) {
        let name = "";
        if(serialno == 0){ name = 'username'; }
        if(serialno == 1){ name = 'name'; }
        if(serialno == 2){ name = 'email'; }
        if(serialno == 3){ name = 'phone'; }
        if(serialno == 4){ name = 'address'; }
        const html = $(this).html();
        const input = $('<input name="'+name+'" class="editableColumnsStyle inputFields" type="text" value="'+html+'" />');
        $(this).html(input);
      });
      $("tr #editsec:eq("+index+")").html('<button type="button" id="updatebtn" data-id='+dataid+'>Update</button>');
    });
  
    $(document).on('click','#updatebtn', function(){
      const dataid = $(this).data("id");
      const emailFilter = /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
      const phoneFilter = /^[0-9]{0,2}$/;
      let values = {};
      $(this).parents('tr').find('td.editableColumns input').each(function() {
        values[$(this).attr("name")] = $(this).val().trim();
      });
      if((values.username.indexOf(" ") < 0) && (values.username != "")){
        if(values.name != ""){
          if((values.email != "") && (emailFilter.test(values.email))){
            if((values.phone != "") && (phoneFilter.test(values.phone))){
              if(values.address != ""){
                $.ajax({
                    url:"/edit-user",
                    method: "POST",
                    data:{userid: dataid, userdata: JSON.stringify(values)},
                    cache: false,
                    beforeSend:function(){
                      Swal.fire({
                          allowOutsideClick: false,
                          customClass: 'swal-wide',
                          title: 'Please Wait',
                          html: 'User data will be update soon',
                          onBeforeOpen: () => {
                              Swal.showLoading()
                          },
                      });
                    }
                }).done(function(returnresult){
                  setTimeout(() => { 
                    Swal.fire({
                        position: 'center',
                        type: returnresult.status,
                        title: ((returnresult.status == 'success')?'Success':'Sorry! Error'),
                        html: returnresult.message,
                        showCancelButton: true,
                        showConfirmButton: false,
                        cancelButtonText: 'Close',
                        allowOutsideClick: false,
                        customClass: 'swal-wide',
                    }).then((result) => {
                      if(returnresult.status == 'success'){
                        $("#customers").html(returnresult.newData);
                      }
                    });
                  }, 500);
                });
              
              }else{
                alert("Address don't leave empty");
              }
            }else{
              alert("Enter valid Phone No (not allow +) please and don't leave it empty");
            }
          }else{
            alert("enter valid Email Id please and don't leave it empty");
          }
        }else{
          alert("Name don't leave empty");
        }
      }else{
        alert("No space please and don't leave it empty");
      }
    });
    // User Edit Code End
    
    // User Delete Code Start
    $(document).on('click','#delete', function(){
      Swal.fire({
          position: 'center',
          type: 'warning',
          title: 'Are you sure?',
          text: "You won't be able to revert this!",
          showConfirmButton: true,
          showCancelButton: true,
          showCloseButton: false,
          confirmButtonText: 'Yes, Delete',
          cancelButtonText: 'Cancel!',
          reverseButtons: true,
          allowOutsideClick: false,
          customClass: 'swal-wide',
      }).then((result) => {
        if(result.value){
          const dataid = $(this).data("id");
          const indexing = $("td #delete").index(this);
          
          $.ajax({
              url:"/delete-user",
              method: "POST",
              data:{userid: dataid},
              cache: false
          }).done(function(returnresult){
            if(returnresult.status == 'success'){
              $("tr #delete:eq("+indexing+")").parents("tr").remove();
            }else{
              Swal.fire({
                  position: 'center',
                  type: returnresult.status,
                  title: 'Sorry! Error',
                  html: returnresult.message,
                  showCancelButton: true,
                  showConfirmButton: false,
                  cancelButtonText: 'Close',
                  allowOutsideClick: false,
                  customClass: 'swal-wide',
              });
            }
          });
        }
      });
    });
    // User Delete Code End

    // Search Function Start
    function search(serachtype){
      const data = $("#searchdata").val().trim();
        $.ajax({
            url:"/search",
            method: "POST",
            data:{searchdata: data, searchtype: serachtype},
            cache: false,
            beforeSend:function(){
              $("#loader").css('display', 'block');
              $("#customers").addClass('blursec');
            }
        }).done(function(returnresult){
          $("#loader").css('display', 'none');
          $("#customers").removeClass('blursec');
          if(returnresult.status == 'success'){
              $("#customers").html(returnresult.html);
              $("#reset").html(' <input type="button" style="cursor: pointer;" id="reset" value="Reset">');
          }else{
            alert("Sorry! Something went wrong...");
          }
        });
    }
    // Search Function End
  });