<?php
//File - PlanSubscriptionScript
//Version - 6.1.0.6
//Last Updated - 2017/06/27
//Updated By - Gihan

require_once('HttpRequestHelper.php');
    $method = "";
    //ini_set('display_errors', '0');
    if (isset ( $_GET ["method"] ))
    	$method = $_GET ["method"];

    switch ($method) {
    	// GET

		case "subscriptionPlan" :
			$planCode = $_POST ["planCode"];
			//$emailAddress = $_POST ["emailAddress"];
			$paymentOption = $_POST ["paymentOption"];
			$subscriptionKey = $_POST ["subscriptionKey"];
			$mode = $_POST ["mode"];
			//var_dump($data);
			$subscription=new PlanSubscriptionService();
			echo $subscription->checkEmailProcess($planCode,$paymentOption,$subscriptionKey,$mode);
			break;

    case "submitProfile" :
          $email = $_POST ["email"];
          $fname = $_POST ["fname"];
          $lname = $_POST ["lname"];
          $country = $_POST ["country"];
          $planCode = $_GET ["planCode"];
          $paymentOption = $_GET ["paymentOption"];
          $subscriptionKey = $_GET ["subscriptionKey"];
          $mode = $_GET ["mode"];
          //var_dump($data);
          $subscription=new PlanSubscriptionService();
          echo $subscription->saveProfile($email,$fname,$lname,$country,$planCode,$paymentOption,$subscriptionKey,$mode);
          break;

    case "submitEmail" :
          $email = $_POST ["email"];
          $planCode = $_GET ["planCode"];
          $paymentOption = $_GET ["paymentOption"];
          $subscriptionKey = $_GET ["subscriptionKey"];
          $mode = $_GET ["mode"];
          //var_dump($data);
          $subscription=new PlanSubscriptionService();
          echo $subscription->checkProfile($email,$planCode,$paymentOption,$subscriptionKey,$mode);
          break;

    case "submitConfirmSubscription" :
          $profileData = $_GET ["profileData"];
          $email = $_GET ["email"];
          $planCode = $_GET ["planCode"];
          $paymentOption = $_GET ["paymentOption"];
          $subscriptionKey = $_GET ["subscriptionKey"];
          $mode = $_GET ["mode"];
          //var_dump($data);
          $subscription=new PlanSubscriptionService();
          echo $subscription->processSubscription($profileData,$planCode,$email,$paymentOption,$subscriptionKey,$mode);
          break;

  case "cardFormResponse" :
            $profileData = $_GET ["profileData"];
            $planCode = $_GET ["planCode"];
            $email = $_GET ["email"];
            $paymentOption = $_GET ["paymentOption"];
            $subscriptionKey = $_GET ["subscriptionKey"];
            $mode = $_GET ["mode"];
            //var_dump($data);
            echo "Card Added Successfully";
            $subscription=new PlanSubscriptionService();
            echo $subscription->checkProfile($email,$planCode,$paymentOption,$subscriptionKey,$mode);
            break;

		case "convert" :
            $amount = $_GET ["amount"];
            $from = $_GET ["from"];
            $meta = $_GET ["meta"];
            //var_dump($data);
            $portal=new PlanSubscriptionService();
            echo $portal->getInvoiceDataByID($amount,$from,$meta);
            break;

    	case "" :
    		header ( 'HTTP/1.1 404 Not Found' );
    		break;
    }

    class PlanSubscriptionService {
        private $headerArray;
        private $azureApiUrl='https://cloudchargedev.azure-api.net/';
        private $serviceUrl='app.cloudcharge.com';

          public function addHeader($k, $v){
            		array_push($this->headerArray, $k . ": " . $v);
        	}

        	public function checkEmailProcess($code,$type,$key,$mode)
          {
            $emailCheckForm="<html><header><title>Email Validation</title></header><body>".
            "<form name='emailValidation' id='emailValidation' action='https://".$this->serviceUrl."/planEmbededForm/planSubscriptionScript.php/?method=submitEmail&&planCode=".$code."&&paymentOption=".$type."&&subscriptionKey=".$key."&&mode=".$mode."' method='post'><div style='padding: 20px 0;margin: 0 auto;overflow: hidden;max-width: 300px;width: 100%;text-align: center'><div style='margin-top: 20px;margin-bottom: 30px;text-align: center;padding: 30px 0;width: 100%;color: #ccc;'><span style='border-radius: 50%;display: inline-block;width: 10px;height: 20px;padding: 0 5px;border: solid 1px #ddd;color: #ccc;margin-right: 10px'>i</span>Enter Email to process</div><div style='overflow: hidden;color: #039be5;'></div><div style='background: linear-gradient(90deg,#fff,#bce9ff, #039be5,#bce9ff, #ffffff);height: 1px;margin-bottom: 20px;'></div><input type='text' name='email' id='email' placeholder='Email address' style='width: 90%;height: 35px;padding: 5px;border-radius:5px;border: solid 1px #bbb;margin-bottom: 20px;'/><br><button type='submit' value='Submit' style='width: 95%;height: 37px;font-size: 17px;padding: 8px 20px;color: #fff;background-color: rgb(3,155,229);box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.26);border: none;border-radius: 5px'>Process</button></div></form>"
            ."</body></html>";
            echo $emailCheckForm;
          }

          public function checkProfile($email,$code,$type,$key,$mode)
          {
              //$data=json_decode($data);
              //var_dump($data);exit();
              //var_dump($code);

              $req=new HttpRequestHelper();
              $this->headerArray=array();
              $url=$this->azureApiUrl.'profile/getProfile/?skip=0&take=1&order=asc&search_parameter=email&search_value='.$email;
              //var_dump($url);
              //var_dump($key);
              $this->addHeader('Ocp-Apim-Subscription-Key', $key);
              $this->addHeader('mode', $mode);
              $this->addHeader('Content-Type', 'application/json');
              $profileData=$req->Get($url, $this->headerArray);
              //var_dump("Profile raw : ".$profileData);
              $profileData=json_decode($profileData,true);
              //var_dump("Profile : ".$profileData);

              if(isset($profileData))
              {

                echo "<br><br>";
                echo "<h3>Profile Details</h3><br>";
                echo "Email Address :";
                echo $profileData[0]["email_addr"];
                echo "<br>First Name :";
                echo $profileData[0]["first_name"];
                echo "<br>Last Name :";
                echo $profileData[0]["last_name"];
                echo "<br>Billing Address :";
                echo $profileData[0]["bill_addr"];
                echo "<br>Country :";
                echo $profileData[0]["bill_country"];
                echo "<br>Create Date :";
                echo $profileData[0]["createddate"];
                echo "<br>Status :";
                if($profileData[0]["status"]=="1")
                {
                  echo "Active";
                }
                else
                {
                  echo "Inactive";
                }

                echo "<br>";
                echo "<h4>Card Details</h4><br>";
                echo "Card ID : ";
                if($profileData[0]["stripeCustId"]!=null)
                {
                  echo $profileData[0]["stripeCustId"];
                }
                else
                {
                  echo "-  (Not Added)";
                }
                echo "<br><br>";

                if($type=='Online')
                {
                  if($profileData[0]["stripeCustId"]==null)
                  {
                    $profileId=$profileData[0]["profileId"];
                    //$profileId="E170CB14-8880-D1DC-E84E-AEEEA2E3EF1F";

                    $data='{
                             "profileId": "'.$profileId.'",
                             "redirectUrl": "https://'.$this->serviceUrl.'/planEmbededForm/planSubscriptionScript.php/?method=cardFormResponse&profileData='.$profileData.'&planCode='.$code.'&email='.$email.'&paymentOption='.$type.'&subscriptionKey='.$key.'&mode='.$mode.'",
                             "action": "insert"
                           }';

                    //echo $data;
                    $req=new HttpRequestHelper();
                    $this->headerArray=array();
                    $url=$this->azureApiUrl.'Cards/loadForm';
                    $this->addHeader('Ocp-Apim-Subscription-Key', $key);
                    $this->addHeader('mode', $mode);
                    $this->addHeader('Content-Type', 'application/json');
                    $loadCardForm=$req->Post($data,$url, $this->headerArray);
                    //var_dump($loadCardForm);

                    echo "<h4>Card Details are not given. Please add Card to Continue!</h4>";
                    echo "<br>";

                    echo $loadCardForm;
                  }
                  else
                  {
                    $subscriptionConfirmForm="<html><header><title>Subscription Confirmation</title></header><body>".
                    "<form name='subscriptionConfirm' id='subscriptionConfirm' action='https://".$this->serviceUrl."/planEmbededForm/planSubscriptionScript.php/?method=submitConfirmSubscription&&profileData=".$profileData."&&email=".$email."&&planCode=".$code."&&paymentOption=".$type."&&subscriptionKey=".$key."&&mode=".$mode."' method='post'><div style='padding: 20px 0;margin: 0 auto;overflow: hidden;max-width: 300px;width: 100%;text-align: center'><div style='overflow: hidden;color: #039be5;'></div><div style='background: linear-gradient(90deg,#fff,#bce9ff, #039be5,#bce9ff, #ffffff);height: 1px;margin-bottom: 20px;'></div><br><button type='submit' value='Submit' style='width: 95%;height: 37px;font-size: 17px;padding: 8px 20px;color: #fff;background-color: rgb(3,155,229);box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.26);border: none;border-radius: 5px'>Confirm Subscription</button></div></form>"
                    ."</body></html>";
                    echo $subscriptionConfirmForm;
                  }
                }
                else
                {
                  $subscriptionConfirmForm="<html><header><title>Subscription Confirmation</title></header><body>".
                  "<form name='subscriptionConfirm' id='subscriptionConfirm' action='https://".$this->serviceUrl."/planEmbededForm/planSubscriptionScript.php/?method=submitConfirmSubscription&&profileData=".$profileData."&&email=".$email."&&planCode=".$code."&&paymentOption=".$type."&&subscriptionKey=".$key."&&mode=".$mode."' method='post'><div style='padding: 20px 0;margin: 0 auto;overflow: hidden;max-width: 300px;width: 100%;text-align: center'><div style='overflow: hidden;color: #039be5;'></div><div style='background: linear-gradient(90deg,#fff,#bce9ff, #039be5,#bce9ff, #ffffff);height: 1px;margin-bottom: 20px;'></div><br><button type='submit' value='Submit' style='width: 95%;height: 37px;font-size: 17px;padding: 8px 20px;color: #fff;background-color: rgb(3,155,229);box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.26);border: none;border-radius: 5px'>Confirm Subscription</button></div></form>"
                  ."</body></html>";
                  echo $subscriptionConfirmForm;
                }

              }
              else
              {
                $emailCheckForm="<html><header><title>Email Validation</title></header><body>".
                "<form name='emailValidation' id='emailValidation' action='https://".$this->serviceUrl."/planEmbededForm/planSubscriptionScript.php/?method=submitEmail&&planCode=".$code."&&paymentOption=".$type."&&subscriptionKey=".$key."&&mode=".$mode."' method='post'><div style='padding: 20px 0;margin: 0 auto;overflow: hidden;max-width: 300px;width: 100%;text-align: center'><div style='margin-top: 20px;margin-bottom: 30px;text-align: center;padding: 30px 0;width: 100%;color: #ccc;'><span style='border-radius: 50%;display: inline-block;width: 10px;height: 20px;padding: 0 5px;border: solid 1px #ddd;color: #ccc;margin-right: 10px'>i</span>Enter Email to process</div><div style='overflow: hidden;color: #039be5;'></div><div style='background: linear-gradient(90deg,#fff,#bce9ff, #039be5,#bce9ff, #ffffff);height: 1px;margin-bottom: 20px;'></div><input type='text' name='email' id='email' value='".$email."' placeholder='Email address' style='width: 90%;height: 35px;padding: 5px;border-radius:5px;border: solid 1px #bbb;margin-bottom: 20px;'/><br><button type='submit' value='Submit' style='width: 95%;height: 37px;font-size: 17px;padding: 8px 20px;color: #fff;background-color: rgb(3,155,229);box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.26);border: none;border-radius: 5px'>Process</button></div></form>"
                ."</body></html>";
                echo $emailCheckForm;

                echo "<br><br>";
                echo "<h3 style='text-align: center'>Profile Registration</h3>";

                $custormerRegisterForm="<html><header><title>Profile Registration</title></header><body>".
                "<form name='profileCreation' id='profileCreation' action='https://".$this->serviceUrl."/planEmbededForm/planSubscriptionScript.php/?method=submitProfile&&planCode=".$code."&&paymentOption=".$type."&&subscriptionKey=".$key."&&mode=".$mode."' method='post'><div style='padding: 20px 0;margin: 0 auto;overflow: hidden;max-width: 300px;width: 100%;text-align: center'><div style='margin-top: 20px;margin-bottom: 30px;text-align: center;padding: 30px 0;width: 100%;color: #ccc;'><span style='border-radius: 50%;display: inline-block;width: 10px;height: 20px;padding: 0 5px;border: solid 1px #ddd;color: #ccc;margin-right: 10px'>i</span>Seems like you are not authorized to proceed to the next step</div><div style='overflow: hidden;color: #039be5;'><h3>Please register to continue</h3></div><div style='background: linear-gradient(90deg,#fff,#bce9ff, #039be5,#bce9ff, #ffffff);height: 1px;margin-bottom: 20px;'></div><input type='text' name='email' id='email' value='".$email."' placeholder='Email address' style='width: 90%;height: 35px;padding: 5px;border-radius:5px;border: solid 1px #bbb;margin-bottom: 20px;'/><br><input type='text' name='fname' id='fname' placeholder='First name' style='width: 90%;height: 35px;padding: 5px;border-radius:5px;border: solid 1px #bbb;margin-bottom: 20px'/><br><input type='text' name='lname' id='lname' placeholder='Last name' style='width: 90%;height: 35px;padding: 5px;border-radius:5px;border: solid 1px #bbb;margin-bottom: 20px'/><br><input type='text' name='country' id='country' placeholder='Country' style='width: 90%;height: 35px;padding: 5px;border-radius:5px;border: solid 1px #bbb;margin-bottom: 20px'/><br><button type='submit' value='Submit' style='width: 95%;height: 37px;font-size: 17px;padding: 8px 20px;color: #fff;background-color: rgb(3,155,229);box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.26);border: none;border-radius: 5px'>Register</button></div></form>"
                ."</body></html>";
                echo $custormerRegisterForm;
              }
          }

        	public function processSubscription($profileData,$code,$email,$type,$key,$mode)
        	{
              if($type=='Offline')
              {
                $data='{
                        "email": "'.$email.'",
                        "planCode": "'.$code.'",
                        "note": "",
                        "qty": 1,
                        "startDate": "'.date( "Y-m-d" ).'",
                        "addOns": [],
                        "coupon": ""
                       }';

                //echo $data;
				//date( "Y-m-d H:i:s" )
                $req=new HttpRequestHelper();
                $this->headerArray=array();
                $url=$this->azureApiUrl.'Subscription/addSubscription';
                $this->addHeader('Ocp-Apim-Subscription-Key', $key);
                $this->addHeader('mode', $mode);
                $this->addHeader('Content-Type', 'application/json');
                $offlineSubscriptionResponse=$req->Post($data,$url, $this->headerArray);
                $offlineSubscriptionResponse=json_decode($offlineSubscriptionResponse,true);
                if($offlineSubscriptionResponse["response"]=="succeeded")
                {
                  echo "<div style='padding: 10px;background: #a0fda0;color: green;border-radius: 3px;text-align: center;font-size: 17px'>Successfully Subscribed</div>";
                }
                else
                {
                  echo "<div style='padding: 10px;background: #ffcec6;color: red;border-radius: 3px;text-align: center;font-size: 17px'>Subscription Failed</div>";
                }
                //var_dump($offlineSubscriptionResponse);
              }
              else
              {

                $data='{
                        "email": "'.$email.'",
                        "planCode": "'.$code.'",
                        "note": "",
                        "qty": 1,
                        "startDate": "'.date( "Y-m-d" ).'",
                        "addOns": [],
                        "coupon": ""
                       }';
                //echo $data;
                $req=new HttpRequestHelper();
                $this->headerArray=array();
                $url=$this->azureApiUrl.'Subscription/addSubscription';
                $this->addHeader('Ocp-Apim-Subscription-Key', $key);
                $this->addHeader('mode', $mode);
                $this->addHeader('Content-Type', 'application/json');
                $onlineSubscriptionResponse=$req->Post($data,$url, $this->headerArray);
                $onlineSubscriptionResponse=json_decode($onlineSubscriptionResponse,true);
                if($onlineSubscriptionResponse["response"]=="succeeded")
                {
                  echo "<div style='padding: 10px;background: #a0fda0;color: green;border-radius: 3px;text-align: center;font-size: 17px'>Successfully Subscribed</div>";
                }
                else
                {
                  echo "<div style='padding: 10px;background: #ffcec6;color: red;border-radius: 3px;text-align: center;font-size: 17px'>Subscription Failed</div>";
                }
                //var_dump($onlineSubscriptionResponse);

              }

        	}

        	private function getInvoiceDataByID($invoiceNo,$staticToken,$domainUrl)
        	{
        		$req=new HttpRequestHelper();
        		$this->headerArray=array();
        		$url='http://'.$domainUrl.'/services/duosoftware.invoice.service/invoice/getByIdWithAllData'.'/?id='.$invoiceNo;
        		//var_dump($url);
        		$this->addHeader('securityToken', $staticToken);
        		$this->addHeader('Content-Type', 'application/json');
        		$invoiceData=$req->Get($url, $this->headerArray);
        		return $invoiceData;
        	}

        	public function saveProfile($email,$fname,$lname,$country,$planCode,$paymentOption,$subscriptionKey,$mode)
          {
            $data='{
                     "email": "'.$email.'",
                     "country": "'.$country.'",
                     "firstName": "'.$fname.'",
                     "lastName": "'.$lname.'"
                   }';

            //echo $data;
            //var_dump("subscription Key : ".$subscriptionKey);
            $req=new HttpRequestHelper();
            $this->headerArray=array();
            $url=$this->azureApiUrl.'profile/insert';
            $this->addHeader('Ocp-Apim-Subscription-Key', $subscriptionKey);
            $this->addHeader('mode', $mode);
            $this->addHeader('Content-Type', 'application/json');
            $profileInsertResponse=$req->Post($data,$url, $this->headerArray);
            //var_dump($profileInsertResponse);
            $profileInsertResponse=json_decode($profileInsertResponse,true);
            if($profileInsertResponse["response"]=="succeeded")
            {
              echo "<div style='padding: 10px;background: #a0fda0;color: green;border-radius: 3px;text-align: center;font-size: 17px'>Profile Created</div>";
              echo "<br>";
              $this->checkProfile($email,$planCode,$paymentOption,$subscriptionKey,$mode);
            }
            else
            {
              echo "<div style='padding: 10px;background: #ffcec6;color: red;border-radius: 3px;text-align: center;font-size: 17px'>Save Profile Failed</div>";
            }
          }

}
?>
